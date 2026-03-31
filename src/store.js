/**
 * Data access layer using Prisma (MySQL). Replace in-memory store.
 */

import prisma from './db.js';

const toRad = (deg) => (deg * Math.PI) / 180;

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function mapRequest(r) {
  if (!r) return null;
  return {
    id: r.id,
    userId: r.userId,
    userName: r.userName,
    email: r.email ?? '',
    phone: r.phone,
    serviceType: r.serviceType,
    location: { lat: r.lat, lng: r.lng, address: r.address || '' },
    requestedTime: r.requestedTime instanceof Date ? r.requestedTime.toISOString().slice(0, 19) : r.requestedTime,
    message: r.message || '',
    status: r.status,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    bids: (r.bids || []).map(mapBid),
  };
}

function mapBid(b) {
  return {
    id: b.id,
    requestId: b.requestId,
    providerId: b.providerId,
    providerName: b.providerName,
    providerRating: b.providerRating,
    price: b.price,
    availableTime: b.availableTime || '',
    message: b.message || '',
    distance: b.distance,
    status: b.status,
    createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
  };
}

function mapProvider(p) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    address: p.address ?? '',
    rating: p.rating,
    serviceType: p.serviceType,
    location: { lat: p.lat, lng: p.lng },
    available: p.available,
    email: p.email || undefined,
  };
}

/** Map provider to property-like shape for GET/POST /properties API (Admin uses providers table, one per userId). */
function mapProviderToPropertyShape(p) {
  if (!p) return null;
  return {
    id: p.id,
    userId: p.userId ?? '',
    userEmail: p.email ?? '',
    title: p.name,
    description: p.description ?? '',
    serviceType: p.serviceType ?? 'property',
    address: p.address ?? undefined,
    lat: p.lat,
    lng: p.lng,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

/** Prisma include for Request so responses have bids */
const requestInclude = { bids: true };

export const store = {
  async listRequests(userId, status) {
    const where = {};
    if (userId) where.userId = userId;
    if (status === 'active') where.status = { in: ['pending', 'bidding'] };
    else if (status === 'accepted') where.status = 'accepted';
    else if (status === 'completed') where.status = 'completed';
    else if (status === 'cancelled') where.status = 'cancelled';

    const list = await prisma.request.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: requestInclude,
    });
    return list.map(mapRequest);
  },

  async getRequest(id) {
    const r = await prisma.request.findUnique({ where: { id }, include: requestInclude });
    return mapRequest(r);
  },

  async createRequest(payload) {
    const date = new Date().toISOString().slice(0, 10);
    const time = payload.time.length <= 5 ? payload.time : payload.time.slice(0, 5);
    const requestedTime = new Date(`${date}T${time}:00`);
    const lat = typeof payload.lat === 'number' ? payload.lat : 37.7749;
    const lng = typeof payload.lng === 'number' ? payload.lng : -122.4194;

    const r = await prisma.request.create({
      data: {
        userId: payload.userId,
        userName: payload.userName || 'User',
        email: payload.email ?? '',
        serviceType: payload.serviceType,
        lat,
        lng,
        address: payload.location || '',
        phone: payload.phone || '',
        requestedTime,
        message: payload.message || '',
        status: payload.status,
      },
      include: requestInclude,
    });
    return mapRequest(r);
  },

  async updateRequest(id, patch) {
    const data = {};
    if (patch.message !== undefined) data.message = patch.message;
    if (patch.requestedTime !== undefined) data.requestedTime = new Date(patch.requestedTime);
    if (patch.status !== undefined) data.status = patch.status;

    const r = await prisma.request.update({
      where: { id },
      data,
      include: requestInclude,
    });
    return mapRequest(r);
  },

  /**
   * Permanently delete a service request and all related bids (DB cascade).
   * @returns {{ ok: true }} | {{ ok: false, reason: 'not_found' | 'forbidden' }}
   */
  async deleteRequestForUser(id, ownerUserId) {
    if (!id || !ownerUserId) return { ok: false, reason: 'not_found' };
    const r = await prisma.request.findUnique({ where: { id } });
    if (!r) return { ok: false, reason: 'not_found' };
    if (r.userId !== ownerUserId) return { ok: false, reason: 'forbidden' };
    await prisma.request.delete({ where: { id } });
    return { ok: true };
  },

  /**
   * Hard-delete bidding requests for this user whose scheduled time has passed.
   * Bids cascade-delete with the request.
   * @returns {Promise<number>} number of rows removed
   */
  async expireStaleBiddingRequests(userId) {
    const uid = userId != null ? String(userId).trim() : '';
    if (!uid) return 0;
    const result = await prisma.request.deleteMany({
      where: {
        userId: uid,
        status: 'bidding',
        requestedTime: { lt: new Date() },
      },
    });
    return result.count;
  },

  /** @deprecated Use deleteRequestForUser — kept if any code still calls soft-cancel */
  async cancelRequest(id) {
    return this.updateRequest(id, { status: 'cancelled' });
  },

  async listRequestsNearby(lat, lng, radiusKm, serviceType, userId) {
    const uid = userId != null ? String(userId).trim() : '';
    if (!uid) {
      return [];
    }
    const where = { userId: uid };
    if (serviceType && serviceType !== 'all') {
      where.serviceType = serviceType;
    }
    const list = await prisma.request.findMany({
      where,
      include: requestInclude,
      orderBy: { createdAt: 'desc' },
    });
    const radius = radiusKm ?? 20;
    const filtered = list.filter((r) => {
      const km = haversineKm(lat, lng, r.lat, r.lng);
      return km <= radius;
    });
    return filtered.map(mapRequest);
  },

  async listBids(requestId) {
    const list = await prisma.bid.findMany({
      where: { requestId },
      orderBy: { createdAt: 'asc' },
    });
    return list.map(mapBid);
  },

  async createBid(requestId, providerId, payload) {
    const req = await prisma.request.findUnique({ where: { id: requestId } });
    if (!req) return null;

    const provider = await prisma.provider.findUnique({ where: { id: providerId } }).catch(() => null)
      || (await prisma.provider.findFirst());
    const effectiveProviderId = provider?.id || providerId;

    const already = await prisma.bid.findFirst({
      where: { requestId, providerId: effectiveProviderId },
    });
    if (already) return { duplicate: true };

    const computedDistance = provider
      ? haversineKm(req.lat, req.lng, provider.lat, provider.lng)
      : 1;
    const distance = payload.distance != null && typeof payload.distance === 'number'
      ? Math.round(Number(payload.distance) * 10) / 10
      : Math.round(computedDistance * 10) / 10;
    const status = (payload.status === 'approved' || payload.status === 'modified')
      ? payload.status
      : (payload.status || 'pending');

    const bid = await prisma.$transaction(async (tx) => {
      const b = await tx.bid.create({
        data: {
          requestId,
          providerId: effectiveProviderId,
          providerName: provider?.name || 'Provider',
          providerRating: provider?.rating ?? 4.5,
          price: Number(payload.price),
          availableTime: payload.availableTime || '',
          message: payload.message || '',
          distance,
          status: status === 'approved' ? 'pending' : status,
        },
      });
      await tx.request.updateMany({
        where: { id: requestId, status: 'pending' },
        data: { status: 'bidding' },
      });
      return b;
    });
    return mapBid(bid);
  },

  async acceptBid(bidId) {
    const bid = await prisma.bid.findUnique({ where: { id: bidId } });
    if (!bid) return null;

    await prisma.$transaction([
      prisma.bid.updateMany({
        where: { requestId: bid.requestId, id: { not: bidId } },
        data: { status: 'rejected' },
      }),
      prisma.bid.update({
        where: { id: bidId },
        data: { status: 'accepted' },
      }),
      prisma.request.update({
        where: { id: bid.requestId },
        data: { status: 'accepted' },
      }),
    ]);

    const updated = await prisma.bid.findUnique({ where: { id: bidId } });
    return mapBid(updated);
  },

  async listAcceptedBidsForUserId(userId) {
    if (!userId || String(userId).trim() === '') return [];
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) return [];

    const list = await prisma.bid.findMany({
      where: { providerId: provider.id, status: 'accepted' },
      include: { request: true },
      orderBy: { createdAt: 'desc' },
    });
    return list.map((b) => ({
      ...mapBid(b),
      request: b.request ? mapRequest(b.request) : null,
    }));
  },

  async listProviders(filters = {}) {
    const where = {};
    if (filters.serviceType && filters.serviceType !== 'all') {
      where.serviceType = filters.serviceType;
    }
    if (filters.search) {
      where.name = { contains: filters.search };
    }

    let list = await prisma.provider.findMany({ where });
    if (filters.lat != null && filters.lng != null && filters.radiusKm != null) {
      list = list.filter((p) =>
        haversineKm(filters.lat, filters.lng, p.lat, p.lng) <= filters.radiusKm
      );
    }
    return list.map(mapProvider);
  },

  async getProvider(id) {
    const p = await prisma.provider.findUnique({ where: { id } });
    return mapProvider(p);
  },

  async getProviderByUserId(userId) {
    if (!userId || String(userId).trim() === '') return null;
    const p = await prisma.provider.findUnique({ where: { userId } });
    return p ? mapProviderToPropertyShape(p) : null;
  },

  async getProperty(id) {
    const p = await prisma.provider.findUnique({ where: { id } });
    return p ? mapProviderToPropertyShape(p) : null;
  },

  async createProperty(data) {
    if (data.userId) {
      await prisma.user.upsert({
        where: { id: data.userId },
        create: { id: data.userId, email: data.userEmail ?? null },
        update: { email: data.userEmail ?? undefined },
      });
    }
    const p = await prisma.provider.create({
      data: {
        userId: data.userId || null,
        name: data.title,
        description: data.description ?? null,
        serviceType: data.serviceType || 'property',
        lat: data.lat,
        lng: data.lng,
        address: data.address ?? null,
        email: data.userEmail ?? null,
      },
    });
    return mapProviderToPropertyShape(p);
  },

  async updatePropertyByUserId(userId, data) {
    if (!userId || String(userId).trim() === '') return null;
    const existing = await prisma.provider.findUnique({ where: { userId } });
    if (!existing) return null;
    const p = await prisma.provider.update({
      where: { userId },
      data: {
        name: data.title,
        description: data.description ?? null,
        serviceType: data.serviceType || 'property',
        lat: data.lat,
        lng: data.lng,
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.userEmail != null ? { email: data.userEmail } : {}),
      },
    });
    return mapProviderToPropertyShape(p);
  },
};
