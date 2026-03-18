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
    rating: p.rating,
    serviceType: p.serviceType,
    location: { lat: p.lat, lng: p.lng },
    available: p.available,
    email: p.email || undefined,
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

  async cancelRequest(id) {
    return this.updateRequest(id, { status: 'cancelled' });
  },

  async listRequestsNearby(lat, lng, radiusKm, serviceType) {
    const list = await prisma.request.findMany({
      include: requestInclude,
      orderBy: { createdAt: 'desc' },
    });
    const radius = radiusKm ?? 10;
    const filtered = list.filter((r) => {
      const km = haversineKm(lat, lng, r.lat, r.lng);
      if (km > radius) return false;
      if (serviceType && serviceType !== 'all' && r.serviceType !== serviceType) return false;
      return true;
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
    const computedDistance = provider
      ? haversineKm(req.lat, req.lng, provider.lat, provider.lng)
      : 1;
    const distance = payload.distance != null && typeof payload.distance === 'number'
      ? Math.round(Number(payload.distance) * 10) / 10
      : Math.round(computedDistance * 10) / 10;
    const status = (payload.status === 'approved' || payload.status === 'modified')
      ? payload.status
      : (payload.status || 'pending');

    const bid = await prisma.bid.create({
      data: {
        requestId,
        providerId: provider?.id || providerId,
        providerName: provider?.name || 'Provider',
        providerRating: provider?.rating ?? 4.5,
        price: Number(payload.price),
        availableTime: payload.availableTime || '',
        message: payload.message || '',
        distance,
        status: status === 'approved' ? 'pending' : status,
      },
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
};
