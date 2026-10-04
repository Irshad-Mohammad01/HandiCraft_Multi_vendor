/**
 * Helper utility for Status Sorting (4-click cycle)
 * Cycle order:
 * 0: Default / Unsorted (Original relative order preserved)
 * 1: Active → Inactive → Blocked
 * 2: Inactive → Active → Blocked
 * 3: Blocked → Active → Inactive
 */

export const getCanonicalStatus = (user) => {
  if (!user) return 'Inactive';
  if (user.status && typeof user.status === 'string') {
    const s = user.status.trim().toLowerCase();
    if (s === 'active') return 'Active';
    if (s === 'blocked') return 'Blocked';
    if (s === 'inactive') return 'Inactive';
  }
  if (user.is_blocked) return 'Blocked';
  return 'Inactive';
};

export const sortUsersByStatus = (userList, mode) => {
  if (!Array.isArray(userList) || userList.length === 0 || !mode || mode === 0) {
    return userList;
  }

  const getPriority = (user) => {
    const status = getCanonicalStatus(user);
    if (mode === 1) {
      // Active → Inactive → Blocked
      if (status === 'Active') return 1;
      if (status === 'Inactive') return 2;
      if (status === 'Blocked') return 3;
      return 4;
    }
    if (mode === 2) {
      // Inactive → Active → Blocked
      if (status === 'Inactive') return 1;
      if (status === 'Active') return 2;
      if (status === 'Blocked') return 3;
      return 4;
    }
    if (mode === 3) {
      // Blocked → Active → Inactive
      if (status === 'Blocked') return 1;
      if (status === 'Active') return 2;
      if (status === 'Inactive') return 3;
      return 4;
    }
    return 0;
  };

  // Stable sort preserving relative index
  return [...userList]
    .map((u, index) => ({ u, index }))
    .sort((a, b) => {
      const pA = getPriority(a.u);
      const pB = getPriority(b.u);
      if (pA !== pB) {
        return pA - pB;
      }
      return a.index - b.index;
    })
    .map(item => item.u);
};
