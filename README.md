# BookEasy — Local Business Booking SaaS MVP

A MERN SaaS starter for salons, tutors, gyms, repair shops and other appointment-based local businesses.

## Features in this MVP
- Business registration and login with JWT
- Add/manage services
- Customer booking API
- Prevent duplicate time-slot bookings
- Owner appointment dashboard
- Confirm/cancel/complete appointments
- Basic revenue and appointment stats
- Responsive React UI
- Uses browser `fetch()` (no Axios)

## Run backend
```bash
cd backend
npm install
copy .env.example .env
npm run dev
```
Make sure MongoDB is running. Edit `.env` if needed.

## Run frontend
```bash
cd frontend
npm install
npm run dev
```
Open the Vite URL, normally `http://localhost:5173`.

## Next production features
1. Public business booking page
2. Business slug/custom URL
3. Availability and working hours
4. Customer booking UI
5. Email/WhatsApp reminders
6. Online payments
7. Subscription billing for businesses
8. Owner analytics
9. Staff accounts
10. Deployment + domain
