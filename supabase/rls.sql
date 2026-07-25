-- Evendor Row Level Security policies (run in Supabase SQL editor)
-- Prisma uses service role on server; RLS protects direct Supabase client access

ALTER TABLE IF EXISTS public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Listing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Favorite" ENABLE ROW LEVEL SECURITY;

-- Users can read/update own profile
CREATE POLICY "users_select_own" ON public."User"
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "users_update_own" ON public."User"
  FOR UPDATE USING (auth.uid()::text = id);

-- Public published listings
CREATE POLICY "listings_public_read" ON public."Listing"
  FOR SELECT USING (status = 'PUBLISHED');

-- Vendors manage own listings (via vendor profile userId)
CREATE POLICY "listings_vendor_manage" ON public."Listing"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."VendorProfile" vp
      WHERE vp.id = "vendorId" AND vp."userId" = auth.uid()::text
    )
  );

-- Favorites: owner only
CREATE POLICY "favorites_owner" ON public."Favorite"
  FOR ALL USING (auth.uid()::text = "userId");

-- Bookings: customer or vendor
CREATE POLICY "bookings_participant" ON public."Booking"
  FOR SELECT USING (
    auth.uid()::text = "customerId"
    OR EXISTS (
      SELECT 1 FROM public."VendorProfile" vp
      WHERE vp.id = "vendorId" AND vp."userId" = auth.uid()::text
    )
  );

-- Messages: conversation participants
CREATE POLICY "messages_participant" ON public."Message"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public."Conversation" c
      WHERE c.id = "conversationId"
      AND (c."customerId" = auth.uid()::text OR EXISTS (
        SELECT 1 FROM public."VendorProfile" vp
        WHERE vp.id = c."vendorId" AND vp."userId" = auth.uid()::text
      ))
    )
  );

CREATE POLICY "messages_insert_sender" ON public."Message"
  FOR INSERT WITH CHECK (auth.uid()::text = "senderId");
