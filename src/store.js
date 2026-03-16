/**
 * In-memory store with seed data. Replace with DB when DATABASE_URL is set.
 */

import { v4 as uuidv4 } from 'uuid';

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

const requests = new Map();
const bids = new Map();
const providers = new Map();
const conversations = new Map();
const messages = new Map();
const activities = new Map();

// Seed providers
const seedProviders = [
  { id: 'p1', name: "Mike's Barbershop", rating: 4.8, serviceType: 'barber', location: { lat: 42.666514002928100, lng: 21.16790105686100 }, available: true, email: "hysenierion8@gmail.com" },
  { id: 'p2', name: 'Downtown Cuts', rating: 4.9, serviceType: 'barber', location: { lat: 42.634514002928300, lng: 21.16590106686300 }, available: true, email: "hysenierion8@gmail.com" },
  { id: 'p3', name: 'Elite Barbers', rating: 4.7, serviceType: 'barber', location: { lat: 42.623514002928600, lng: 21.16490107686600 }, available: true, email: "hysenierion8@gmail.com" },
  { id: 'p4', name: 'Nail Artistry', rating: 4.9, serviceType: 'beauty', location: { lat: 42.612514002928900, lng: 21.16390108686900 }, available: true, email: "hysenierion8@gmail.com" },
  { id: 'p5', name: 'Quick Fix Handyman', rating: 4.6, serviceType: 'handyman', location: { lat: 42.632514002928900, lng: 21.16890108686900 }, available: true, email: "hysenierion8@gmail.com" },
];
seedProviders.forEach((p) => providers.set(p.id, { ...p }));

// Seed requests with bids
const seedBids1 = [
  { id: 'bid1', requestId: '1', providerId: 'p1', providerName: "Mike's Barbershop", providerRating: 4.8, price: 35, availableTime: '4:15 PM', message: 'Available at 4:15 PM, 10 minutes away.', distance: 0.8, status: 'pending', createdAt: '2026-03-13T14:35:00' },
  { id: 'bid2', requestId: '1', providerId: 'p2', providerName: 'Downtown Cuts', providerRating: 4.9, price: 40, availableTime: '4:00 PM', message: 'Can start right at 4 PM!', distance: 0.5, status: 'pending', createdAt: '2026-03-13T14:38:00' },
  { id: 'bid3', requestId: '1', providerId: 'p3', providerName: 'Elite Barbers', providerRating: 4.7, price: 45, availableTime: '4:30 PM', message: 'Premium service available', distance: 1.2, status: 'pending', createdAt: '2026-03-13T14:40:00' },
];
seedBids1.forEach((b) => bids.set(b.id, { ...b }));

const seedRequests = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Sarah Johnson',
    serviceType: 'barber',
    location: { lat: 37.7749, lng: -122.4194, address: 'Market St, San Francisco, CA' },
    requestedTime: '2026-03-13T16:00:00',
    message: 'I need a haircut at 4 PM near the station.',
    status: 'bidding',
    createdAt: '2026-03-13T14:30:00',
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'John Smith',
    serviceType: 'handyman',
    location: { lat: 37.7849, lng: -122.4094, address: 'Mission District, San Francisco, CA' },
    requestedTime: '2026-03-14T10:00:00',
    message: 'Need help fixing a leaky faucet',
    status: 'pending',
    createdAt: '2026-03-13T15:00:00',
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'Emily Davis',
    serviceType: 'beauty',
    location: { lat: 37.7649, lng: -122.4294, address: 'SOMA, San Francisco, CA' },
    requestedTime: '2026-03-13T18:00:00',
    message: 'Manicure and pedicure',
    status: 'bidding',
    createdAt: '2026-03-13T15:15:00',
  },
];
seedRequests.forEach((r) => requests.set(r.id, { ...r }));

// Seed conversations and messages

function getBidsForRequest(requestId) {
  return [...bids.values()].filter((b) => b.requestId === requestId);
}

function requestWithBids(req) {
  return { ...req, bids: getBidsForRequest(req.id) };
}

export const store = {
  // Requests
  listRequests(userId, status) {
    let list = [...requests.values()].filter((r) => !userId || r.userId === userId);
    if (status === 'active') list = list.filter((r) => r.status === 'pending' || r.status === 'bidding');
    else if (status === 'completed') list = list.filter((r) => r.status === 'completed');
    else if (status === 'cancelled') list = list.filter((r) => r.status === 'cancelled');
    return list.map(requestWithBids);
  },
  getRequest(id) {
    const r = requests.get(id);
    return r ? requestWithBids(r) : null;
  },
  createRequest(userId, userName, payload) {
    const date = new Date().toISOString().slice(0, 10);
    const time = payload.time.length <= 5 ? payload.time : payload.time.slice(0, 5);
    const requestedTime = `${date}T${time}:00`;
    const id = uuidv4();
    const req = {
      id,
      userId,
      userName: userName || 'User',
      serviceType: payload.serviceType,
      location: { lat: 37.7749, lng: -122.4194, address: payload.location || '' },
      requestedTime,
      message: payload.message || '',
      status: 'bidding',
      createdAt: new Date().toISOString(),
    };
    requests.set(id, req);
    return requestWithBids(req);
  },
  updateRequest(id, patch) {
    const r = requests.get(id);
    if (!r) return null;
    const updated = { ...r, ...patch };
    requests.set(id, updated);
    return requestWithBids(updated);
  },
  cancelRequest(id) {
    return this.updateRequest(id, { status: 'cancelled' });
  },
  listRequestsNearby(lat, lng, radiusKm, serviceType) {
    const list = [...requests.values()].filter((r) => {
      const km = haversineKm(lat, lng, r.location.lat, r.location.lng);
      if (km > (radiusKm ?? 10)) return false;
      if (serviceType && serviceType !== 'all' && r.serviceType !== serviceType) return false;
      return true;
    });
    return list.map(requestWithBids);
  },

  // Bids
  listBids(requestId) {
    return getBidsForRequest(requestId);
  },
  createBid(requestId, providerId, payload) {
    const req = requests.get(requestId);
    if (!req) return null;
    const provider = providers.get(providerId) || providers.values().next().value;
    const distance = provider ? haversineKm(req.location.lat, req.location.lng, provider.location.lat, provider.location.lng) : 1;
    const id = uuidv4();
    const bid = {
      id,
      requestId,
      providerId: provider?.id || providerId,
      providerName: provider?.name || 'Provider',
      providerRating: provider?.rating ?? 4.5,
      price: Number(payload.price),
      availableTime: payload.availableTime || '',
      message: payload.message || '',
      distance: Math.round(distance * 10) / 10,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    bids.set(id, bid);
    return bid;
  },
  acceptBid(bidId) {
    const bid = bids.get(bidId);
    if (!bid) return null;
    bids.set(bidId, { ...bid, status: 'accepted' });
    [...bids.values()].filter((b) => b.requestId === bid.requestId && b.id !== bidId).forEach((b) => bids.set(b.id, { ...b, status: 'rejected' }));
    const req = requests.get(bid.requestId);
    if (req) requests.set(req.id, { ...req, status: 'accepted' });
    return bids.get(bidId);
  },

  // Providers
  listProviders(filters = {}) {
    let list = [...providers.values()];
    if (filters.serviceType && filters.serviceType !== 'all') list = list.filter((p) => p.serviceType === filters.serviceType);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (filters.lat != null && filters.lng != null && filters.radiusKm != null) {
      list = list.filter((p) => haversineKm(filters.lat, filters.lng, p.location.lat, p.location.lng) <= filters.radiusKm);
    }
    return list;
  },
  getProvider(id) {
    return providers.get(id) || null;
  },
};
