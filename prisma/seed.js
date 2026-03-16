/**
 * Seed script: run after db:push or db:migrate.
 * Usage: npm run db:seed  (or npx prisma db seed)
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();

const seedProviders = [
  { id: 'p1', name: "Mike's Barbershop", rating: 4.8, serviceType: 'barber', lat: 42.6665140029281, lng: 21.167901056861, available: true, email: 'hysenierion8@gmail.com' },
  { id: 'p2', name: 'Downtown Cuts', rating: 4.9, serviceType: 'barber', lat: 42.6345140029283, lng: 21.165901066863, available: true, email: 'hysenierion8@gmail.com' },
  { id: 'p3', name: 'Elite Barbers', rating: 4.7, serviceType: 'barber', lat: 42.6235140029286, lng: 21.164901076866, available: true, email: 'hysenierion8@gmail.com' },
  { id: 'p4', name: 'Nail Artistry', rating: 4.9, serviceType: 'beauty', lat: 42.6125140029289, lng: 21.163901086869, available: true, email: 'hysenierion8@gmail.com' },
  { id: 'p5', name: 'Quick Fix Handyman', rating: 4.6, serviceType: 'handyman', lat: 42.6325140029289, lng: 21.168901086869, available: true, email: 'hysenierion8@gmail.com' },
];

async function main() {
  const existing = await prisma.provider.count();
  if (existing > 0) {
    console.log('Providers already seeded, skipping.');
    return;
  }

  for (const p of seedProviders) {
    await prisma.provider.upsert({
      where: { id: p.id },
      create: p,
      update: p,
    });
  }
  console.log('Seeded', seedProviders.length, 'providers.');

  await prisma.request.create({
    data: {
      id: 'seed-req-1',
      userId: 'user1',
      userName: 'Sarah Johnson',
      serviceType: 'barber',
      lat: 37.7749,
      lng: -122.4194,
      address: 'Market St, San Francisco, CA',
      requestedTime: new Date('2026-03-13T16:00:00'),
      message: 'I need a haircut at 4 PM near the station.',
      status: 'bidding',
      createdAt: new Date('2026-03-13T14:30:00'),
    },
  });

  await prisma.bid.createMany({
    data: [
      { id: 'bid1', requestId: 'seed-req-1', providerId: 'p1', providerName: "Mike's Barbershop", providerRating: 4.8, price: 35, availableTime: '4:15 PM', message: 'Available at 4:15 PM, 10 minutes away.', distance: 0.8, status: 'pending', createdAt: new Date('2026-03-13T14:35:00') },
      { id: 'bid2', requestId: 'seed-req-1', providerId: 'p2', providerName: 'Downtown Cuts', providerRating: 4.9, price: 40, availableTime: '4:00 PM', message: 'Can start right at 4 PM!', distance: 0.5, status: 'pending', createdAt: new Date('2026-03-13T14:38:00') },
      { id: 'bid3', requestId: 'seed-req-1', providerId: 'p3', providerName: 'Elite Barbers', providerRating: 4.7, price: 45, availableTime: '4:30 PM', message: 'Premium service available', distance: 1.2, status: 'pending', createdAt: new Date('2026-03-13T14:40:00') },
    ],
  });

  await prisma.request.createMany({
    data: [
      { id: 'seed-req-2', userId: 'user2', userName: 'John Smith', serviceType: 'handyman', lat: 37.7849, lng: -122.4094, address: 'Mission District, San Francisco, CA', requestedTime: new Date('2026-03-14T10:00:00'), message: 'Need help fixing a leaky faucet', status: 'pending', createdAt: new Date('2026-03-13T15:00:00') },
      { id: 'seed-req-3', userId: 'user3', userName: 'Emily Davis', serviceType: 'beauty', lat: 37.7649, lng: -122.4294, address: 'SOMA, San Francisco, CA', requestedTime: new Date('2026-03-13T18:00:00'), message: 'Manicure and pedicure', status: 'bidding', createdAt: new Date('2026-03-13T15:15:00') },
    ],
  });

  console.log('Seeded sample requests and bids.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
