import os
import sys
import bcrypt
from datetime import datetime, timedelta
import pytz

# Setup path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app
from backend.extensions import db
from backend.models.user import UserModel, DeliveryAddress, Cart
from backend.models.admin import AdminModel
from backend.models.category import Category
from backend.models.product import ProductModel, ProductImageModel
from backend.models.coupon import CouponModel
from backend.models.banner import BannerModel
from backend.models.order import OrderModel, OrderItem
from backend.models.review import ReviewModel
from backend.models.transaction import TransactionModel

def seed_craftnest_data():
    print("Beginning CraftNest Indian Handicrafts Database Seeding...")

    with app.app_context():
        # 1. Ensure schema is updated
        try:
            db.create_all()
        except Exception as e:
            print("db.create_all notice:", e)

        try:
            db.session.execute(db.text("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'customer'"))
            db.session.commit()
            print("Added 'role' column to users table.")
        except Exception:
            db.session.rollback()

        # 2. Seed Admin / Owner credentials
        print("Seeding Admin & Owner accounts...")
        admin_pw_hash = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Check AdminModel
        for username in ["owner", "admin"]:
            existing_adm = AdminModel.query.filter_by(username=username).first()
            if not existing_adm:
                db.session.add(AdminModel(username=username, password=admin_pw_hash))
            else:
                existing_adm.password = admin_pw_hash
        db.session.commit()

        # 3. Seed Users with distinct roles
        user_credentials = [
            {
                "email": "owner@craftnest.com",
                "name": "Rajesh Singhania (Owner)",
                "password": "Admin@123",
                "phone": "9811122233",
                "role": "owner",
                "is_admin": True,
                "address": {
                    "house_number": "10-A",
                    "building_name": "Heritage Heights",
                    "street": "MG Road",
                    "area": "Civil Lines",
                    "landmark": "Near Town Hall",
                    "city": "Jaipur",
                    "state": "Rajasthan",
                    "pincode": "302001",
                    "address_type": "Office"
                }
            },
            {
                "email": "subowner@craftnest.com",
                "name": "Priya Sharma (Operations)",
                "password": "SubOwner@123",
                "phone": "9876543211",
                "role": "sub_owner",
                "is_admin": False,
                "address": {
                    "house_number": "42",
                    "building_name": "Artisan Enclave",
                    "street": "Station Road",
                    "area": "Vaishali Nagar",
                    "landmark": "Opposite National Handloom",
                    "city": "Jaipur",
                    "state": "Rajasthan",
                    "pincode": "302021",
                    "address_type": "Office"
                }
            },
            {
                "email": "artisan@craftnest.com",
                "name": "Jaipur Artisan Guild",
                "password": "Seller@123",
                "phone": "9876543212",
                "role": "seller",
                "is_admin": False,
                "address": {
                    "house_number": "Shop 14",
                    "building_name": "Bapu Bazaar Crafts Complex",
                    "street": "Bapu Bazaar",
                    "area": "Pink City",
                    "landmark": "Sanganeri Gate",
                    "city": "Jaipur",
                    "state": "Rajasthan",
                    "pincode": "302003",
                    "address_type": "Work"
                }
            },
            {
                "email": "customer@craftnest.com",
                "name": "Aarav Sharma",
                "password": "Customer@123",
                "phone": "9876543210",
                "role": "customer",
                "is_admin": False,
                "address": {
                    "house_number": "Flat 302",
                    "building_name": "Vedic Residency",
                    "street": "Indira Nagar 4th Cross",
                    "area": "Indira Nagar",
                    "landmark": "Near BDA Complex",
                    "city": "Bengaluru",
                    "state": "Karnataka",
                    "pincode": "560038",
                    "address_type": "Home"
                }
            }
        ]

        created_users = {}
        for uc in user_credentials:
            existing_user = UserModel.query.filter_by(email=uc["email"]).first()
            pw_hash = bcrypt.hashpw(uc["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            if not existing_user:
                u = UserModel(
                    full_name=uc["name"],
                    email=uc["email"],
                    password_hash=pw_hash,
                    phone=uc["phone"],
                    is_admin=uc["is_admin"],
                    role=uc["role"],
                    email_verified=True,
                    is_blocked=False,
                    preferred_language="en",
                    first_login=False
                )
                db.session.add(u)
                db.session.flush()
                
                addr_data = uc["address"]
                addr = DeliveryAddress(
                    user_id=u.id,
                    house_number=addr_data["house_number"],
                    building_name=addr_data["building_name"],
                    street=addr_data["street"],
                    area=addr_data["area"],
                    landmark=addr_data["landmark"],
                    city=addr_data["city"],
                    state=addr_data["state"],
                    pincode=addr_data["pincode"],
                    country="India",
                    address_type=addr_data["address_type"],
                    is_default=True
                )
                db.session.add(addr)
                cart = Cart(user_id=u.id)
                db.session.add(cart)
                created_users[uc["role"]] = u
            else:
                existing_user.password_hash = pw_hash
                existing_user.full_name = uc["name"]
                existing_user.role = uc["role"]
                existing_user.is_admin = uc["is_admin"]
                existing_user.email_verified = True
                created_users[uc["role"]] = existing_user

        db.session.commit()
        print("Users seeded successfully (Owner, Sub Owner, Seller, Customer).")

        # 4. Seed Handicraft Categories
        print("Seeding Indian Handicraft categories...")
        categories_data = [
            {
                "name": "Pottery & Terracotta",
                "name_en": "Pottery & Terracotta",
                "name_hi": "मिट्टी और टेराकोटा कला",
                "image_url": "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80"
            },
            {
                "name": "Handloom & Textiles",
                "name_en": "Handloom & Textiles",
                "name_hi": "हथकरघा और वस्त्र",
                "image_url": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80"
            },
            {
                "name": "Wooden Crafts",
                "name_en": "Wooden Crafts",
                "name_hi": "काष्ठ कला और नक्काशी",
                "image_url": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80"
            },
            {
                "name": "Brass & Metalware",
                "name_en": "Brass & Metalware",
                "name_hi": "पीतल और धातु शिल्प",
                "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80"
            },
            {
                "name": "Marble Inlay & Stonework",
                "name_en": "Marble Inlay & Stonework",
                "name_hi": "संगमरमर जड़ाई और पत्थर शिल्प",
                "image_url": "https://images.unsplash.com/photo-1582561424760-0321d75e81fa?auto=format&fit=crop&w=800&q=80"
            },
            {
                "name": "Traditional Folk Paintings",
                "name_en": "Traditional Folk Paintings",
                "name_hi": "पारंपरिक लोक चित्रकला",
                "image_url": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80"
            }
        ]

        cat_map = {}
        for c in categories_data:
            existing_c = Category.query.filter_by(name=c["name"]).first()
            if not existing_c:
                new_cat = Category(
                    name=c["name"],
                    name_en=c["name_en"],
                    name_hi=c["name_hi"],
                    image_url=c["image_url"]
                )
                db.session.add(new_cat)
                db.session.flush()
                cat_map[c["name"]] = new_cat
            else:
                existing_c.image_url = c["image_url"]
                existing_c.name_en = c["name_en"]
                existing_c.name_hi = c["name_hi"]
                cat_map[c["name"]] = existing_c

        db.session.commit()
        print(f"Categories seeded: {len(cat_map)} categories.")

        # 5. Seed Handicraft Products
        print("Seeding authentic Indian Handicraft products...")
        products_data = [
            {
                "name": "Hand-painted Blue Pottery Floral Vase",
                "name_en": "Hand-painted Blue Pottery Floral Vase",
                "name_hi": "हाथ से चित्रित ब्लू पॉटरी फूलदान",
                "category": "Pottery & Terracotta",
                "price": 1850.00,
                "discount": 15.00,
                "stock": 24,
                "ratings": 4.9,
                "created_by": "Jaipur Artisan Guild",
                "show_on_homepage": True,
                "description": "Exquisite handmade authentic Jaipur Blue Pottery vase crafted using traditional quartz powder, Fuller's earth, and natural plant gum. Delicately hand-painted with cobalt oxide floral motifs that reflect centuries of royal Rajasthani heritage.",
                "features_en": "100% Genuine Jaipur Blue Pottery; Hand-glazed with cobalt blue and turquoise pigments; Kiln-fired at 800°C for smooth porcelain-like finish; Durable water-resistant interior coating.",
                "specifications_en": "Height: 10 inches; Diameter: 5 inches; Weight: 850 grams; Material: Quartz powder & natural glass; Origin: Jaipur, Rajasthan; Care: Wipe clean with dry microfiber cloth.",
                "images": [
                    "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=900&q=80"
                ]
            },
            {
                "name": "Terracotta Earthen Water Dispenser Jug",
                "name_en": "Terracotta Earthen Water Dispenser Jug",
                "name_hi": "पारंपरिक मिट्टी का पानी का घड़ा (सुराही)",
                "category": "Pottery & Terracotta",
                "price": 1290.00,
                "discount": 10.00,
                "stock": 35,
                "ratings": 4.8,
                "created_by": "Jaipur Artisan Guild",
                "show_on_homepage": True,
                "description": "Naturally cooling terracotta clay water vessel hand-thrown on potters wheels by rural Bengal artisans. Untreated and porous micro-structure allows natural evaporation, keeping drinking water refreshingly cool with therapeutic earth minerals.",
                "features_en": "Natural eco-cooling without electricity; 100% natural red clay free of lead and arsenic; Includes fitted clay lid and ergonomic serving spout; Enhances water with alkaline natural minerals.",
                "specifications_en": "Capacity: 3.5 Litres; Height: 12 inches; Weight: 1.4 kg; Material: Natural Riverbed Red Clay; Origin: Bankura, West Bengal.",
                "images": [
                    "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?auto=format&fit=crop&w=900&q=80"
                ]
            },
            {
                "name": "Banarasi Katan Silk Handloom Brocade Saree",
                "name_en": "Banarasi Katan Silk Handloom Brocade Saree",
                "name_hi": "बनारसी कातान सिल्क हथकरघा साड़ी",
                "category": "Handloom & Textiles",
                "price": 8499.00,
                "discount": 12.00,
                "stock": 15,
                "ratings": 5.0,
                "created_by": "Varanasi Weavers Trust",
                "show_on_homepage": True,
                "description": "A masterpiece of Indian handloom weaving from Varanasi. Pure mulberry Katan silk warp and weft enriched with intricate Zari brocade in traditional floral jaal and meenakari borders. Each saree takes master artisans over 3 weeks of intensive handloom work.",
                "features_en": "Certified Silk Mark India guaranteed; Pure Mulberry Katan Silk with gold and silver electroplated zari; Woven on traditional wooden pit looms; Includes unstitched matching blouse piece (80 cm).",
                "specifications_en": "Length: 5.5 metres + 0.8 metre blouse; Width: 46 inches; Weight: 720 grams; Weave: Kadwa Jaal; Origin: Varanasi, Uttar Pradesh; Care: Dry clean only.",
                "images": [
                    "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=80"
                ]
            },
            {
                "name": "Kashmiri Hand-Embroidered Pashmina Shawl",
                "name_en": "Kashmiri Hand-Embroidered Pashmina Shawl",
                "name_hi": "कश्मीरी हाथ से कढ़ाई की गई पश्मीना शॉल",
                "category": "Handloom & Textiles",
                "price": 6250.00,
                "discount": 8.00,
                "stock": 18,
                "ratings": 4.9,
                "created_by": "Kashmir Crafts Collective",
                "show_on_homepage": True,
                "description": "Ultra-fine handwoven Pashmina shawl adorned with Sozni needlework by master craftsmen in the Kashmir Valley. Weighs virtually nothing yet provides remarkable natural warmth and a buttery soft luxury feel against the skin.",
                "features_en": "Hand-spun Changthangi goat cashmere fleece; Authentic Sozni needle embroidery on border; Feather-light weight with superior thermal insulation; Hand-dyed with AZO-free gentle pigments.",
                "specifications_en": "Dimensions: 200 cm x 100 cm (Full Stole); Weight: 180 grams; Material: 100% Cashmere Pashmina; Origin: Srinagar, Jammu & Kashmir.",
                "images": [
                    "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=900&q=80"
                ]
            },
            {
                "name": "Saharanpur Hand-Carved Sheesham Wood Jewelry Box",
                "name_en": "Saharanpur Hand-Carved Sheesham Wood Jewelry Box",
                "name_hi": "सहारनपुर नक्काशीदार शीशम की लकड़ी का बॉक्स",
                "category": "Wooden Crafts",
                "price": 1450.00,
                "discount": 20.00,
                "stock": 40,
                "ratings": 4.7,
                "created_by": "Jaipur Artisan Guild",
                "show_on_homepage": True,
                "description": "Handcrafted Indian Rosewood (Sheesham) keepsake chest featuring deep relief floral openwork jali carving on top and sides. Fitted with brass hinges and plush red velvet interior lining to protect treasured jewelry, heirloom keepsakes, or wristwatches.",
                "features_en": "100% Solid Seasoned Sheesham Wood; Jali lattice hand-carving by hereditary Saharanpur artisans; Antique brass latch and hinges; Soft velvet interior compartments.",
                "specifications_en": "Dimensions: 9 x 6 x 3.5 inches; Weight: 920 grams; Finish: Natural wax polish (chemical-free); Origin: Saharanpur, Uttar Pradesh.",
                "images": [
                    "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=900&q=80"
                ]
            },
            {
                "name": "Channapatna Eco Wooden Stacking Nesting Dolls",
                "name_en": "Channapatna Eco Wooden Stacking Nesting Dolls",
                "name_hi": "चन्नापटना पर्यावरण अनुकूल लकड़ी के खिलौने",
                "category": "Wooden Crafts",
                "price": 890.00,
                "discount": 0.00,
                "stock": 50,
                "ratings": 4.8,
                "created_by": "Artisan Guild",
                "show_on_homepage": True,
                "description": "Geographical Indication (GI) tagged Channapatna wooden hand-turned stacking figurines. Turned on lathes from soft ivory wood (Wrightia tinctoria) and hand-lacquered with organic vegetable dyes (turmeric, indigo, kumkum) making them 100% non-toxic and child-safe.",
                "features_en": "Official GI Tag certified handicraft; 100% safe non-toxic vegetable lacquer coating; Smooth splinter-free rounded contours; Educational motor-skill development.",
                "specifications_en": "Set of 5 nesting figures; Largest height: 5.5 inches; Material: Wrightia tinctoria (Aale mara) wood; Origin: Channapatna, Karnataka.",
                "images": [
                    "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=900&q=80"
                ]
            },
            {
                "name": "Moradabad Antique Brass Temple Diya Lamp",
                "name_en": "Moradabad Antique Brass Temple Diya Lamp",
                "name_hi": "मुरादाबाद हस्तनिर्मित पीतल का मयूर दीया",
                "category": "Brass & Metalware",
                "price": 2750.00,
                "discount": 10.00,
                "stock": 28,
                "ratings": 4.9,
                "created_by": "Jaipur Artisan Guild",
                "show_on_homepage": True,
                "description": "Heavy handcrafted solid brass Peacock (Mayur) oil lamp forged in the famed brass hub of Moradabad. Features five wicks around a deep oil reservoir topped by a sculpted dancing peacock with intricate feather engravings.",
                "features_en": "Cast in virgin grade high-density bell brass; Hand-chiseled feather and base carvings; Holds oil for up to 10 hours continuous burning; Heavy balanced pedestal prevents tipping.",
                "specifications_en": "Height: 14 inches; Base diameter: 4.5 inches; Weight: 1.85 kg; Finish: Antique golden patina; Origin: Moradabad, Uttar Pradesh.",
                "images": [
                    "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=900&q=80"
                ]
            },
            {
                "name": "Dhokra Tribal Lost-Wax Brass Bull Figurine",
                "name_en": "Dhokra Tribal Lost-Wax Brass Bull Figurine",
                "name_hi": "ढोकरा जनजातीय लॉस्ट-वैक्स कांस्य नंदी बैल",
                "category": "Brass & Metalware",
                "price": 1950.00,
                "discount": 5.00,
                "stock": 20,
                "ratings": 4.8,
                "created_by": "Bastar Tribal Artisans",
                "show_on_homepage": True,
                "description": "A rare 4000-year-old Indus Valley lost-wax (Cire Perdue) casting technique preserved by Bastar tribal artisans. Every single piece is cast in an individual clay mould that is destroyed during retrieval, making each bull sculpture uniquely one-of-a-kind.",
                "features_en": "Ancient 4000-year Harappan metallurgical method; Non-ferrous copper-tin-brass bell metal; Distinctive coiled brass wire surface texture; Authentic tribal heritage artwork.",
                "specifications_en": "Length: 7 inches; Height: 5.5 inches; Weight: 740 grams; Material: Bell Metal Alloy; Origin: Bastar, Chhattisgarh.",
                "images": [
                    "https://images.unsplash.com/photo-1567696911980-2eed69a46042?auto=format&fit=crop&w=900&q=80"
                ]
            },
            {
                "name": "Agra Pietra Dura Marble Inlay Coasters (Set of 6)",
                "name_en": "Agra Pietra Dura Marble Inlay Coasters (Set of 6)",
                "name_hi": "आगरा पिएत्रा ड्यूरा संगमरमर जड़ाई कोस्टर सेट",
                "category": "Marble Inlay & Stonework",
                "price": 2400.00,
                "discount": 15.00,
                "stock": 22,
                "ratings": 4.9,
                "created_by": "Jaipur Artisan Guild",
                "show_on_homepage": True,
                "description": "Inspired by the architectural wonders of the Taj Mahal, these Makrana white marble coasters are meticulously inlaid with genuine semi-precious gemstones (Lapis Lazuli, Malachite, Carnelian, Jasper, and Mother of Pearl) by descendants of Mughal court artisans.",
                "features_en": "Authentic Makrana pure white marble; Hand-cut semi-precious stone inlays seamlessly polished; Felt backing protects furniture from scratches; Includes handcrafted carved marble holder.",
                "specifications_en": "Diameter: 3.5 inches each; Thickness: 8 mm; Set of 6 with marble stand; Origin: Agra, Uttar Pradesh; Care: Wash gently with mild soap.",
                "images": [
                    "https://images.unsplash.com/photo-1582561424760-0321d75e81fa?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80"
                ]
            },
            {
                "name": "Handmade Soapstone Aromatherapy Oil Burner",
                "name_en": "Handmade Soapstone Aromatherapy Oil Burner",
                "name_hi": "हाथ से तराशा गया सोपस्टोन तेल डिफ्यूज़र",
                "category": "Marble Inlay & Stonework",
                "price": 950.00,
                "discount": 0.00,
                "stock": 45,
                "ratings": 4.7,
                "created_by": "Jaipur Artisan Guild",
                "show_on_homepage": True,
                "description": "Carved out of single blocks of Gorara natural soapstone, this aroma diffuser features intricate geometric jaali cut-outs that cast enchanting flickering shadows when a tealight is lit within. Holds essential oils and camphor safely.",
                "features_en": "100% Natural Gorara Soapstone; Heat-resistant deep upper bowl; Jaali work creates warm atmospheric lantern shadows; Removable top bowl for effortless cleaning.",
                "specifications_en": "Height: 4.5 inches; Diameter: 3 inches; Weight: 520 grams; Origin: Agra, Uttar Pradesh.",
                "images": [
                    "https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=900&q=80"
                ]
            },
            {
                "name": "Madhubani Tree of Life Handpainted Canvas Scroll",
                "name_en": "Madhubani Tree of Life Handpainted Canvas Scroll",
                "name_hi": "मधुबनी जीवन का वृक्ष हस्तनिर्मित चित्रकला",
                "category": "Traditional Folk Paintings",
                "price": 3200.00,
                "discount": 10.00,
                "stock": 16,
                "ratings": 5.0,
                "created_by": "Mithila Women Artisan Collective",
                "show_on_homepage": True,
                "description": "Authentic Mithila folk painting depicting the sacred 'Tree of Life' symbolising abundance, connection, and peace. Drawn with bamboo nibs and painted using 100% natural organic pigments extracted from marigold petals, crushed rice, turmeric, and soot.",
                "features_en": "Original Mithila (Madhubani) handmade art; 100% Organic natural botanical dyes; Hand-painted on heavy cotton canvas; Signed by the master woman artisan.",
                "specifications_en": "Size: 24 x 18 inches (Unframed rolled canvas); Medium: Natural dyes on handmade cotton canvas; Origin: Madhubani, Bihar.",
                "images": [
                    "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=900&q=80"
                ]
            },
            {
                "name": "Warli Tribal Folk Art Framed Miniature Panel",
                "name_en": "Warli Tribal Folk Art Framed Miniature Panel",
                "name_hi": "वारली जनजातीय लोक कला फ़्रेमयुक्त पैनल",
                "category": "Traditional Folk Paintings",
                "price": 1650.00,
                "discount": 15.00,
                "stock": 30,
                "ratings": 4.8,
                "created_by": "Maharashtra Tribal Federation",
                "show_on_homepage": True,
                "description": "Traditional Warli tribal art panel capturing harvest celebrations (Tarpa dance) in rhythmic geometric circles. Painted with natural rice flour paste on ochre cow dung-coated handmade paper, encased in an antique teak-finished wood frame with glass.",
                "features_en": "Traditional Tarpa spiral circle dance scene; Natural rice flour paste medium; High-clarity glass and seasoned wood frame; Ready to hang brass hook attached.",
                "specifications_en": "Frame size: 14 x 11 inches; Weight: 850 grams; Medium: Rice paste on mud-plastered paper; Origin: Palghar, Maharashtra.",
                "images": [
                    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=900&q=80"
                ]
            }
        ]

        saved_products = []
        for p in products_data:
            cat = cat_map.get(p["category"])
            cat_id = cat.id if cat else None
            
            existing_p = ProductModel.query.filter_by(name=p["name"]).first()
            if not existing_p:
                new_prod = ProductModel(
                    name=p["name"],
                    name_en=p["name_en"],
                    name_hi=p["name_hi"],
                    price=p["price"],
                    discount=p["discount"],
                    description=p["description"],
                    description_en=p["description"],
                    description_hi=p["description"],
                    features_en=p["features_en"],
                    specifications_en=p["specifications_en"],
                    stock=p["stock"],
                    category_id=cat_id,
                    ratings=p["ratings"],
                    created_by=p["created_by"],
                    status="active",
                    show_on_homepage=p["show_on_homepage"],
                    images=p["images"]
                )
                db.session.add(new_prod)
                db.session.flush()
                
                # Add product images
                for idx, img_url in enumerate(p["images"]):
                    p_img = ProductImageModel(
                        product_id=new_prod.id,
                        image_url=img_url,
                        image_order=idx
                    )
                    db.session.add(p_img)
                saved_products.append(new_prod)
            else:
                existing_p.price = p["price"]
                existing_p.discount = p["discount"]
                existing_p.stock = p["stock"]
                existing_p.category_id = cat_id
                existing_p.created_by = p["created_by"]
                existing_p.show_on_homepage = p["show_on_homepage"]
                existing_p.images = p["images"]
                saved_products.append(existing_p)

        db.session.commit()
        print(f"Products seeded: {len(saved_products)} products.")

        # 6. Seed Promotional Banners
        print("Seeding Banners...")
        banners_data = [
            {
                "title": "Timeless Indian Craftsmanship",
                "subtitle": "Direct From Master Artisans",
                "description": "Explore authentic handcrafted blue pottery, brass lamps, and wooden carvings.",
                "button_text": "Explore Collection",
                "button_link": "/products",
                "image_url": "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1600&q=80",
                "is_active": True
            },
            {
                "title": "Handloom Silks & Royal Textiles",
                "subtitle": "Centuries of Weaving Heritage",
                "description": "Discover genuine Banarasi Katan silks and featherlight Kashmiri Pashminas.",
                "button_text": "Shop Handloom",
                "button_link": "/products?category=Handloom+%26+Textiles",
                "image_url": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=80",
                "is_active": True
            },
            {
                "title": "Hand-Carved Wooden Treasures",
                "subtitle": "Artisan Home Accents",
                "description": "Solid Sheesham wood keepsake chests and GI-tagged Channapatna craft.",
                "button_text": "Shop Wooden Crafts",
                "button_link": "/products?category=Wooden+Crafts",
                "image_url": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1600&q=80",
                "is_active": True
            }
        ]

        for b in banners_data:
            existing_b = BannerModel.query.filter_by(title=b["title"]).first()
            if not existing_b:
                db.session.add(BannerModel(
                    title=b["title"],
                    subtitle=b.get("subtitle", ""),
                    description=b.get("description", ""),
                    button_text=b.get("button_text", "Explore"),
                    button_link=b["button_link"],
                    image_url=b["image_url"],
                    is_active=b["is_active"]
                ))
        db.session.commit()

        # 7. Seed Coupons
        print("Seeding Coupons...")
        coupons_data = [
            {
                "code": "CRAFT10",
                "discount_type": "percent",
                "discount_value": 10.0,
                "min_order_amount": 1000.0,
                "is_active": True
            },
            {
                "code": "HERITAGE500",
                "discount_type": "flat",
                "discount_value": 500.0,
                "min_order_amount": 3500.0,
                "is_active": True
            },
            {
                "code": "WELCOME15",
                "discount_type": "percent",
                "discount_value": 15.0,
                "min_order_amount": 2000.0,
                "is_active": True
            }
        ]

        for cp in coupons_data:
            existing_cp = CouponModel.query.filter_by(code=cp["code"]).first()
            if not existing_cp:
                db.session.add(CouponModel(
                    code=cp["code"],
                    discount_type=cp["discount_type"],
                    discount_value=cp["discount_value"],
                    min_order_amount=cp["min_order_amount"],
                    is_active=cp["is_active"]
                ))
        db.session.commit()

        # 8. Seed Sample Customer Orders & Reviews for Aarav Sharma
        print("Seeding Customer Orders & Reviews...")
        customer_user = UserModel.query.filter_by(email="customer@craftnest.com").first()
        if customer_user and saved_products:
            if OrderModel.query.filter_by(user_id=customer_user.id).count() == 0:
                p1 = saved_products[0]
                p2 = saved_products[4] if len(saved_products) > 4 else saved_products[1]

                # Order 1: Shipped
                o1 = OrderModel(
                    order_id="CN-884219",
                    user_id=customer_user.id,
                    total_amount=float(p1.price * (1 - p1.discount/100)),
                    order_status="Shipped",
                    status="Shipped",
                    delivery_date=(datetime.now() + timedelta(days=2)).strftime("%d-%m-%Y"),
                    carrier="BlueDart Express",
                    tracking_id="BD-99482103",
                    tracking_url="https://bluedart.com/tracking/BD-99482103",
                    shipping_address={
                        "name": customer_user.name,
                        "phone": customer_user.phone,
                        "street": "Indira Nagar 4th Cross",
                        "city": "Bengaluru",
                        "state": "Karnataka",
                        "pincode": "560038"
                    },
                    tracking_history=[
                        {"status": "Pending", "message": "Order placed successfully.", "updated_at": (datetime.now() - timedelta(days=2)).isoformat()},
                        {"status": "Confirmed", "message": "Artisan confirmed the handcrafting schedule.", "updated_at": (datetime.now() - timedelta(days=2, hours=-4)).isoformat()},
                        {"status": "Packed", "message": "Secure protective eco-cushion packaging completed.", "updated_at": (datetime.now() - timedelta(days=1)).isoformat()},
                        {"status": "Shipped", "message": "Dispatched via BlueDart Express Hub.", "updated_at": datetime.now().isoformat()}
                    ],
                    created_at=datetime.now() - timedelta(days=2),
                    terms_accepted=True
                )
                db.session.add(o1)
                db.session.flush()

                db.session.add(OrderItem(
                    order_id=o1.id,
                    product_id=p1.id,
                    name=p1.name,
                    price=p1.price,
                    quantity=1,
                    image=p1.images[0] if p1.images else ""
                ))

                # Order 2: Delivered
                o2 = OrderModel(
                    order_id="CN-773190",
                    user_id=customer_user.id,
                    total_amount=float(p2.price * (1 - p2.discount/100)),
                    order_status="Delivered",
                    status="Delivered",
                    delivery_date=(datetime.now() - timedelta(days=3)).strftime("%d-%m-%Y"),
                    carrier="Delhivery Logistics",
                    tracking_id="DL-88391024",
                    tracking_url="https://delhivery.com/track/DL-88391024",
                    shipping_address={
                        "name": customer_user.name,
                        "phone": customer_user.phone,
                        "street": "Indira Nagar 4th Cross",
                        "city": "Bengaluru",
                        "state": "Karnataka",
                        "pincode": "560038"
                    },
                    tracking_history=[
                        {"status": "Pending", "message": "Order placed successfully.", "updated_at": (datetime.now() - timedelta(days=7)).isoformat()},
                        {"status": "Confirmed", "message": "Order verified.", "updated_at": (datetime.now() - timedelta(days=6)).isoformat()},
                        {"status": "Packed", "message": "Handcraft inspected and packed.", "updated_at": (datetime.now() - timedelta(days=5)).isoformat()},
                        {"status": "Shipped", "message": "In transit to Bengaluru.", "updated_at": (datetime.now() - timedelta(days=4)).isoformat()},
                        {"status": "Out for Delivery", "message": "Courier executive is out for delivery.", "updated_at": (datetime.now() - timedelta(days=3, hours=4)).isoformat()},
                        {"status": "Delivered", "message": "Delivered into customer hands.", "updated_at": (datetime.now() - timedelta(days=3)).isoformat()}
                    ],
                    created_at=datetime.now() - timedelta(days=7),
                    terms_accepted=True
                )
                db.session.add(o2)
                db.session.flush()

                db.session.add(OrderItem(
                    order_id=o2.id,
                    product_id=p2.id,
                    name=p2.name,
                    price=p2.price,
                    quantity=1,
                    image=p2.images[0] if p2.images else ""
                ))

                # Also seed sample reviews
                db.session.add(ReviewModel(
                    product_id=p1.id,
                    user_id=customer_user.id,
                    user_name=customer_user.name,
                    rating=5,
                    comment="The blue pottery vase arrived in pristine condition! Stunning artistry, the floral glazes look even more majestic in person."
                ))

                db.session.add(ReviewModel(
                    product_id=p2.id,
                    user_id=customer_user.id,
                    user_name=customer_user.name,
                    rating=5,
                    comment="Magnificent wood craftsmanship. The sheesham grain and velvet lining feel supremely high quality."
                ))

                db.session.commit()
                print("Customer sample orders & reviews seeded.")

        print("CraftNest database seeding complete!")

if __name__ == '__main__':
    seed_craftnest_data()
