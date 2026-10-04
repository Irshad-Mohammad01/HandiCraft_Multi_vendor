import os
import io
from datetime import datetime
from sqlalchemy import func
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas

from backend.extensions import db
from backend.models.invoice import InvoiceModel
from backend.models.order import OrderModel
from backend.models.settings import SiteSettingModel
from backend.models.user import UserModel
from backend.utils.timezone import get_ist_time, format_iso_datetime

# Directory for generated PDF storage
INVOICE_STORAGE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'static', 'invoices'
)
os.makedirs(INVOICE_STORAGE_DIR, exist_ok=True)

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and stamp 'Page X of Y' on invoices.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#718096"))
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 36, 25, page_str)
        self.drawString(36, 25, "CRAFTNEST — Authenticated Indian Heritage Handicraft Tax Invoice")
        self.restoreState()


def get_business_details():
    """Retrieve brand and business settings from database with fallbacks."""
    settings = {}
    try:
        rows = SiteSettingModel.query.all()
        for r in rows:
            settings[r.key] = r.value
    except Exception:
        pass

    return {
        "platform_name": settings.get("platform_name") or "CRAFTNEST",
        "tagline": "Heritage Handicrafts & Artisan Emporium",
        "business_name": "CraftNest Artisan Technologies Pvt. Ltd.",
        "business_address": settings.get("business_address") or "CraftNest Artisan Hub, Bapu Bazaar, Jaipur, Rajasthan 302001, India",
        "gstin": settings.get("gstin") or "08AAACC1234F1Z8",
        "state": "Rajasthan",
        "state_code": "08",
        "support_email": settings.get("support_email") or "care@craftnest.in",
        "support_phone": settings.get("support_phone") or "+91 141 256 7890",
        "whatsapp": settings.get("whatsapp_number") or "+91 98765 43210",
        "website": "www.craftnest.in"
    }


def generate_unique_invoice_number():
    """
    Generate sequential unique invoice number: CN-INV-YYYY-XXXXXX
    Ensures no collision using database max query.
    """
    current_year = get_ist_time().year
    prefix = f"CN-INV-{current_year}-"
    
    # Query highest id or existing invoice count
    try:
        highest_inv = InvoiceModel.query.filter(
            InvoiceModel.invoice_number.like(f"{prefix}%")
        ).order_by(InvoiceModel.id.desc()).first()
        
        if highest_inv and highest_inv.invoice_number:
            last_seq = int(highest_inv.invoice_number.split("-")[-1])
            next_seq = last_seq + 1
        else:
            total_count = InvoiceModel.query.count()
            next_seq = total_count + 1
    except Exception:
        total_count = db.session.query(func.count(InvoiceModel.id)).scalar() or 0
        next_seq = total_count + 1

    candidate = f"{prefix}{next_seq:06d}"
    
    # Guard against duplicates
    while InvoiceModel.query.filter_by(invoice_number=candidate).first() is not None:
        next_seq += 1
        candidate = f"{prefix}{next_seq:06d}"
        
    return candidate


def generate_invoice_for_order(order_or_id, commit=True):
    """
    Generate or retrieve existing invoice for a given OrderModel instance or order_id.
    Guarantees idempotency: returns existing invoice if already generated.
    """
    if isinstance(order_or_id, (int, str)):
        if str(order_or_id).isdigit():
            order = OrderModel.query.get(int(order_or_id))
        else:
            order = OrderModel.query.filter_by(order_id=str(order_or_id)).first()
    else:
        order = order_or_id

    if not order:
        raise ValueError(f"Order '{order_or_id}' not found.")

    # 1. Idempotency check: Return existing invoice immediately
    existing_invoice = InvoiceModel.query.filter_by(order_id=order.id).first()
    if existing_invoice:
        # Check if PDF exists on disk, if missing regenerate it
        pdf_full_path = os.path.join(INVOICE_STORAGE_DIR, f"{existing_invoice.invoice_number}.pdf")
        if not os.path.exists(pdf_full_path):
            try:
                generate_invoice_pdf(existing_invoice, pdf_full_path)
                existing_invoice.invoice_pdf_path = f"/static/invoices/{existing_invoice.invoice_number}.pdf"
                if commit:
                    db.session.commit()
            except Exception as e:
                print(f"[INVOICE WARN] Failed to recreate PDF for existing invoice {existing_invoice.invoice_number}: {e}")
        return existing_invoice

    # 2. Extract Customer & Addresses
    shipping_snapshot = order.shipping_address or {}
    cust_name = (
        shipping_snapshot.get("full_name") or
        shipping_snapshot.get("name") or
        (order.user.name if order.user else "Valued Patron")
    )
    cust_phone = (
        shipping_snapshot.get("mobile_number") or
        shipping_snapshot.get("phone") or
        (order.user.phone if order.user else "")
    )
    cust_email = (
        shipping_snapshot.get("email") or
        (order.user.email if order.user else "")
    )
    
    billing_snapshot = dict(shipping_snapshot)
    billing_snapshot["name"] = cust_name
    billing_snapshot["phone"] = cust_phone
    billing_snapshot["email"] = cust_email

    # 3. Item breakdown & Tax calculation
    items_snapshot = []
    gst_rate = 5.0 # 5% GST on Indian Handicrafts
    
    for it in order.items:
        qty = int(it.quantity or 1)
        u_price = float(it.price or 0.0)
        item_total = round(u_price * qty, 2)
        
        # Calculate taxable amount from tax-inclusive price
        taxable_amt = round(item_total / (1.0 + (gst_rate / 100.0)), 2)
        gst_amt = round(item_total - taxable_amt, 2)
        
        artisan_label = "Master Artisan"
        prod_id_str = str(it.product_id) if it.product_id else "CN-ART-001"
        discount_val = 0.0
        
        if it.product:
            if it.product.seller:
                artisan_label = it.product.seller.name or it.product.seller.username or "Heritage Artisan"
            elif it.product.created_by:
                artisan_label = it.product.created_by
            discount_val = float(it.product.discount or 0.0)
        elif it.seller:
            artisan_label = it.seller.name or it.seller.username or "Heritage Artisan"

        items_snapshot.append({
            "product_id": prod_id_str,
            "name": it.name or "Handcrafted Artifact",
            "artisan_name": artisan_label,
            "quantity": qty,
            "unit_price": u_price,
            "discount": discount_val,
            "taxable_amount": taxable_amt,
            "gst_rate": gst_rate,
            "gst_amount": gst_amt,
            "final_amount": item_total,
            "image": it.image or ""
        })

    # 4. Financial Calculations
    grand_total = float(order.total_amount or 0.0)
    total_tax = round(sum(it["gst_amount"] for it in items_snapshot), 2)
    subtotal = round(grand_total - total_tax, 2)
    
    # Check Destination State for CGST + SGST vs IGST
    dest_state = str(shipping_snapshot.get("state") or "").strip().lower()
    is_intra_state = ("rajasthan" in dest_state)
    
    if is_intra_state:
        cgst_amt = round(total_tax / 2.0, 2)
        sgst_amt = round(total_tax - cgst_amt, 2)
        igst_amt = 0.0
    else:
        cgst_amt = 0.0
        sgst_amt = 0.0
        igst_amt = total_tax

    inv_num = generate_unique_invoice_number()
    invoice_date = get_ist_time()
    order_date = order.created_at or get_ist_time()

    invoice = InvoiceModel(
        invoice_number=inv_num,
        order_id=order.id,
        customer_id=order.user_id,
        invoice_date=invoice_date,
        order_date=order_date,
        subtotal=subtotal,
        discount_amount=0.00,
        tax_amount=total_tax,
        cgst_amount=cgst_amt,
        sgst_amount=sgst_amt,
        igst_amount=igst_amt,
        shipping_charges=0.00,
        grand_total=grand_total,
        payment_method=order.payment_method or "CASH_ON_DELIVERY",
        payment_status=order.payment_status or "PENDING",
        customer_name=cust_name,
        customer_email=cust_email,
        customer_phone=cust_phone,
        billing_address_snapshot=billing_snapshot,
        shipping_address_snapshot=shipping_snapshot,
        items_snapshot=items_snapshot,
        invoice_pdf_path=f"/static/invoices/{inv_num}.pdf",
        created_at=invoice_date
    )

    db.session.add(invoice)
    if commit:
        db.session.commit()
    else:
        db.session.flush()

    # 5. Generate PDF file immediately
    pdf_full_path = os.path.join(INVOICE_STORAGE_DIR, f"{inv_num}.pdf")
    try:
        generate_invoice_pdf(invoice, pdf_full_path)
    except Exception as e:
        print(f"[INVOICE ERROR] PDF generation failed for {inv_num}: {e}")

    return invoice


def generate_invoice_pdf(invoice, output_filepath=None):
    """
    Generate a high-grade, professional CRAFTNEST PDF Invoice using ReportLab Platypus.
    Includes rich branding, GST details, customer info, product breakdown table,
    and payment mode/status disclosures.
    """
    if not output_filepath:
        output_filepath = os.path.join(INVOICE_STORAGE_DIR, f"{invoice.invoice_number}.pdf")

    biz = get_business_details()

    doc = SimpleDocTemplate(
        output_filepath,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#7B2D26")     # Deep Terracotta / Artisan Burgundy
    PRIMARY_DARK = colors.HexColor("#541E19")
    GOLD = colors.HexColor("#C69A5B")        # Antique Gold
    CHARCOAL = colors.HexColor("#2B2523")    # Deep Patron Charcoal
    MUTED = colors.HexColor("#6F625D")       # Warm Muted Gray
    BG_CREAM = colors.HexColor("#FFF9F3")    # CraftNest Cream
    BG_CARD = colors.HexColor("#F9F4EE")     # Card Tint
    BORDER = colors.HexColor("#E6D8CC")      # Warm Border
    SUCCESS = colors.HexColor("#2E7D32")     # Paid Green
    WARNING = colors.HexColor("#C05621")     # Pending Amber

    # Custom Typography Styles
    style_brand = ParagraphStyle(
        'BrandHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY
    )
    style_tagline = ParagraphStyle(
        'BrandTagline',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=GOLD,
        textTransform='uppercase'
    )
    style_biz_info = ParagraphStyle(
        'BizInfo',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=MUTED
    )
    style_inv_title = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=CHARCOAL,
        alignment=2 # Right align
    )
    style_inv_meta = ParagraphStyle(
        'InvoiceMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=CHARCOAL,
        alignment=2 # Right align
    )
    style_section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=PRIMARY,
        textTransform='uppercase'
    )
    style_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=CHARCOAL
    )
    style_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=CHARCOAL
    )
    style_cell_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=1 # Center
    )

    story = []

    # =========================================================================
    # HEADER: BRANDING & INVOICE TITLE
    # =========================================================================
    left_header = [
        Paragraph("<b>CRAFTNEST</b>", style_brand),
        Paragraph("HERITAGE HANDICRAFTS & ARTISAN EMPORIUM", style_tagline),
        Spacer(1, 4),
        Paragraph(f"<b>{biz['business_name']}</b>", style_biz_info),
        Paragraph(f"{biz['business_address']}", style_biz_info),
        Paragraph(f"<b>GSTIN:</b> {biz['gstin']} | <b>State:</b> {biz['state']} (Code: {biz['state_code']})", style_biz_info),
        Paragraph(f"<b>Email:</b> {biz['support_email']} | <b>Phone:</b> {biz['support_phone']}", style_biz_info),
    ]

    inv_date_str = invoice.invoice_date.strftime("%d %b %Y, %I:%M %p") if invoice.invoice_date else "N/A"
    ord_date_str = invoice.order_date.strftime("%d %b %Y, %I:%M %p") if invoice.order_date else "N/A"
    order_num = invoice.order.order_id if invoice.order else f"ORD-{invoice.order_id}"

    right_header = [
        Paragraph("TAX INVOICE", style_inv_title),
        Spacer(1, 4),
        Paragraph(f"<b>Invoice No:</b> <font color='{PRIMARY.hexval()}'>{invoice.invoice_number}</font>", style_inv_meta),
        Paragraph(f"<b>Order ID:</b> {order_num}", style_inv_meta),
        Paragraph(f"<b>Invoice Date:</b> {inv_date_str}", style_inv_meta),
        Paragraph(f"<b>Order Date:</b> {ord_date_str}", style_inv_meta),
    ]

    header_table = Table(
        [[left_header, right_header]],
        colWidths=[330, 193]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 12))

    # Divider bar
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceBefore=0, spaceAfter=12))

    # =========================================================================
    # CUSTOMER & BILLING DETAILS (2-COLUMN BOX)
    # =========================================================================
    ship = invoice.shipping_address_snapshot or {}
    bill = invoice.billing_address_snapshot or ship

    def format_address_block(addr):
        lines = []
        name = addr.get("full_name") or addr.get("name") or invoice.customer_name or "Valued Patron"
        phone = addr.get("mobile_number") or addr.get("phone") or invoice.customer_phone or ""
        email = addr.get("email") or invoice.customer_email or ""
        lines.append(f"<b>{name}</b>")
        
        street_parts = [addr.get("house_number"), addr.get("street") or addr.get("address"), addr.get("area")]
        street_str = ", ".join([str(p).strip() for p in street_parts if p and str(p).strip()])
        if street_str:
            lines.append(street_str)
            
        city_parts = [addr.get("city"), addr.get("state"), addr.get("pincode") or addr.get("postal_code")]
        city_str = ", ".join([str(p).strip() for p in city_parts if p and str(p).strip()])
        if city_str:
            lines.append(city_str)
            
        country = addr.get("country") or "India"
        lines.append(country)
        
        if phone:
            lines.append(f"<b>Contact:</b> {phone}")
        if email:
            lines.append(f"<b>Email:</b> {email}")
            
        return "<br/>".join(lines)

    bill_box = [
        Paragraph("<b>BILLING TO</b>", style_section_title),
        Spacer(1, 4),
        Paragraph(format_address_block(bill), style_cell),
    ]

    ship_box = [
        Paragraph("<b>SHIPPING DESTINATION</b>", style_section_title),
        Spacer(1, 4),
        Paragraph(format_address_block(ship), style_cell),
    ]

    addr_table = Table(
        [[bill_box, ship_box]],
        colWidths=[260, 263]
    )
    addr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (0, 0), BG_CARD),
        ('BACKGROUND', (1, 0), (1, 0), BG_CARD),
        ('BOX', (0, 0), (0, 0), 1, BORDER),
        ('BOX', (1, 0), (1, 0), 1, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(addr_table)
    story.append(Spacer(1, 10))

    # =========================================================================
    # PAYMENT METHOD & PAYMENT STATUS BANNER
    # =========================================================================
    is_cod = (invoice.payment_method or '').upper() == 'CASH_ON_DELIVERY'
    payment_method_label = "CASH ON DELIVERY (COD)" if is_cod else (invoice.payment_method or 'ONLINE PAYMENT').upper()
    payment_status_label = "PAYMENT PENDING" if is_cod else (invoice.payment_status or 'PENDING').upper()

    status_color = WARNING if is_cod or payment_status_label != 'PAID' else SUCCESS

    payment_banner_text = [
        Paragraph(
            f"<b>PAYMENT METHOD:</b> {payment_method_label} &nbsp;&nbsp;|&nbsp;&nbsp; "
            f"<b>PAYMENT STATUS:</b> <font color='{status_color.hexval()}'><b>{payment_status_label}</b></font>",
            ParagraphStyle(
                'PaymentBannerStyle',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=8.5,
                leading=12,
                textColor=CHARCOAL
            )
        )
    ]
    if is_cod:
        payment_banner_text.append(
            Paragraph(
                "<font color='#C05621'><b>Notice:</b> Cash collection required upon product delivery. Payment is not collected until delivery confirmation.</font>",
                ParagraphStyle('CodNotice', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=10, textColor=WARNING)
            )
        )

    payment_banner_table = Table(
        [[payment_banner_text]],
        colWidths=[523]
    )
    payment_banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_CREAM),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#F6AD55") if is_cod else BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(payment_banner_table)
    story.append(Spacer(1, 12))

    # =========================================================================
    # PRODUCT DETAILS TABLE
    # =========================================================================
    table_headers = [
        Paragraph("Product & Artisan", style_cell_header),
        Paragraph("Product ID", style_cell_header),
        Paragraph("Qty", style_cell_header),
        Paragraph("Unit Price", style_cell_header),
        Paragraph("Taxable Amt", style_cell_header),
        Paragraph("GST Rate", style_cell_header),
        Paragraph("GST Amt", style_cell_header),
        Paragraph("Total (₹)", style_cell_header),
    ]
    
    col_widths = [165, 55, 30, 52, 58, 48, 55, 60]
    table_data = [table_headers]

    items = invoice.items_snapshot or []
    for idx, item in enumerate(items):
        p_name = item.get("name") or "Handcrafted Item"
        artisan = item.get("artisan_name") or "Master Artisan"
        p_id = str(item.get("product_id") or "CN-001")
        qty = item.get("quantity", 1)
        unit_price = float(item.get("unit_price", 0.0))
        taxable_amt = float(item.get("taxable_amount", 0.0))
        gst_r = float(item.get("gst_rate", 5.0))
        gst_a = float(item.get("gst_amount", 0.0))
        final_amt = float(item.get("final_amount", 0.0))

        item_desc = f"<b>{p_name}</b><br/><font color='{MUTED.hexval()}' size='6.5'>Artisan: {artisan}</font>"

        row = [
            Paragraph(item_desc, style_cell),
            Paragraph(p_id, ParagraphStyle('PID', parent=style_cell, alignment=1, fontSize=7.5)),
            Paragraph(str(qty), ParagraphStyle('PQty', parent=style_cell, alignment=1)),
            Paragraph(f"₹{unit_price:,.2f}", ParagraphStyle('PUnit', parent=style_cell, alignment=2)),
            Paragraph(f"₹{taxable_amt:,.2f}", ParagraphStyle('PTaxable', parent=style_cell, alignment=2)),
            Paragraph(f"{gst_r:.1f}%", ParagraphStyle('PGstR', parent=style_cell, alignment=1)),
            Paragraph(f"₹{gst_a:,.2f}", ParagraphStyle('PGstA', parent=style_cell, alignment=2)),
            Paragraph(f"<b>₹{final_amt:,.2f}</b>", ParagraphStyle('PTot', parent=style_cell_bold, alignment=2)),
        ]
        table_data.append(row)

    products_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    
    # Alternating row styling
    prod_styles = [
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]
    for r_idx in range(1, len(table_data)):
        if r_idx % 2 == 0:
            prod_styles.append(('BACKGROUND', (0, r_idx), (-1, r_idx), BG_CREAM))
            
    products_table.setStyle(TableStyle(prod_styles))
    story.append(products_table)
    story.append(Spacer(1, 12))

    # =========================================================================
    # SUMMARY & FINANCIAL TOTALS SECTION
    # =========================================================================
    notes_block = [
        Paragraph("<b>Terms & Conditions:</b>", ParagraphStyle('TermsH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, textColor=CHARCOAL)),
        Paragraph("1. All items are authentic handmade handicrafts produced by verified Indian artisans.", style_biz_info),
        Paragraph("2. Return or exchange claims must be submitted within 7 days of verified delivery.", style_biz_info),
        Paragraph("3. For assistance, write to care@craftnest.in or call +91 141 256 7890.", style_biz_info),
        Spacer(1, 6),
        Paragraph("<b>Thank you for supporting traditional Indian heritage crafts!</b>", ParagraphStyle('ThankYou', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, textColor=PRIMARY)),
    ]

    subtotal_val = float(invoice.subtotal or 0.0)
    cgst_val = float(invoice.cgst_amount or 0.0)
    sgst_val = float(invoice.sgst_amount or 0.0)
    igst_val = float(invoice.igst_amount or 0.0)
    tax_val = float(invoice.tax_amount or 0.0)
    shipping_val = float(invoice.shipping_charges or 0.0)
    grand_total_val = float(invoice.grand_total or 0.0)

    summary_rows = [
        [Paragraph("Subtotal (Taxable Value):", style_cell_bold), Paragraph(f"₹{subtotal_val:,.2f}", ParagraphStyle('SVal', parent=style_cell, alignment=2))],
    ]

    if cgst_val > 0 or sgst_val > 0:
        summary_rows.append([Paragraph("CGST (2.5%):", style_cell), Paragraph(f"₹{cgst_val:,.2f}", ParagraphStyle('CGVal', parent=style_cell, alignment=2))])
        summary_rows.append([Paragraph("SGST (2.5%):", style_cell), Paragraph(f"₹{sgst_val:,.2f}", ParagraphStyle('SGVal', parent=style_cell, alignment=2))])
    elif igst_val > 0:
        summary_rows.append([Paragraph("IGST (5.0%):", style_cell), Paragraph(f"₹{igst_val:,.2f}", ParagraphStyle('IGVal', parent=style_cell, alignment=2))])
    else:
        summary_rows.append([Paragraph("Taxes (GST 5%):", style_cell), Paragraph(f"₹{tax_val:,.2f}", ParagraphStyle('TVal', parent=style_cell, alignment=2))])

    shipping_label = "FREE" if shipping_val == 0 else f"₹{shipping_val:,.2f}"
    summary_rows.append([Paragraph("Shipping & Handling:", style_cell), Paragraph(shipping_label, ParagraphStyle('ShVal', parent=style_cell, alignment=2))])
    
    # Grand Total row
    summary_rows.append([
        Paragraph("<b>GRAND TOTAL:</b>", ParagraphStyle('GTotH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9.5, textColor=PRIMARY)),
        Paragraph(f"<b>₹{grand_total_val:,.2f}</b>", ParagraphStyle('GTotVal', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, textColor=PRIMARY, alignment=2))
    ])

    # Amount Paid / Payable
    due_label = "Amount Payable (Due on Delivery):" if is_cod else "Amount Paid (Online Verified):"
    summary_rows.append([
        Paragraph(f"<b>{due_label}</b>", style_cell_bold),
        Paragraph(f"<b>₹{grand_total_val:,.2f}</b>", ParagraphStyle('DueVal', parent=style_cell_bold, alignment=2, textColor=WARNING if is_cod else SUCCESS))
    ])

    summary_table = Table(summary_rows, colWidths=[150, 110])
    summary_table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, -3), 0.5, BORDER),
        ('LINEBELOW', (0, -2), (-1, -2), 1.5, PRIMARY),
        ('BACKGROUND', (0, -2), (-1, -2), BG_CARD),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))

    footer_layout = Table(
        [[notes_block, summary_table]],
        colWidths=[253, 270]
    )
    footer_layout.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    
    story.append(KeepTogether(footer_layout))
    story.append(Spacer(1, 15))

    # =========================================================================
    # AUTHORIZED DECLARATION
    # =========================================================================
    declaration = Paragraph(
        "<i>This is a computer-generated tax invoice issued by CraftNest. No physical signature is required under IT Act, 2000. "
        "CraftNest acts as a patron marketplace empowering registered indigenous artisans across India.</i>",
        ParagraphStyle('Decl', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=7, leading=9, textColor=MUTED, alignment=1)
    )
    story.append(declaration)

    # Build the PDF with NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    return output_filepath
