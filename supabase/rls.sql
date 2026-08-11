-- Evendor Row Level Security
-- Run in Supabase Dashboard → SQL Editor → New query → Run
--
-- Why this is safe for Evendor:
-- - App data access goes through Prisma (DATABASE_URL / postgres role), which bypasses RLS.
-- - Browser Supabase client is used for Auth only (not table queries).
-- - Enabling RLS without anon/authenticated policies locks PostgREST public API access.
--
-- After running: Dashboard → Advisors → Security should clear "rls_disabled_in_public".

-- ─── Enable RLS on all app tables ───────────────────────────────────────────
ALTER TABLE IF EXISTS public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."VendorProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Listing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."VenueDetails" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."PortfolioMedia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Favorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."QuoteRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."BusinessCustomer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."VendorStaff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."BlockedDate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."RewardsWallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."RewardTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."AnalyticsEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Dispute" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."DisputeEvidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Payout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Withdrawal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."VerificationRequest" ENABLE ROW LEVEL SECURITY;

-- ─── Policies (idempotent: drop then create) ────────────────────────────────
-- Optional: allow authenticated users limited reads where the browser might need them.
-- Most Evendor traffic uses Prisma APIs, so these are defense-in-depth.

DROP POLICY IF EXISTS "users_select_own" ON public."User";
DROP POLICY IF EXISTS "users_update_own" ON public."User";
CREATE POLICY "users_select_own" ON public."User"
  FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "users_update_own" ON public."User"
  FOR UPDATE USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "listings_public_read" ON public."Listing";
DROP POLICY IF EXISTS "listings_vendor_manage" ON public."Listing";
CREATE POLICY "listings_public_read" ON public."Listing"
  FOR SELECT USING (status = 'PUBLISHED');
CREATE POLICY "listings_vendor_manage" ON public."Listing"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."VendorProfile" vp
      WHERE vp.id = "vendorId" AND vp."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "favorites_owner" ON public."Favorite";
CREATE POLICY "favorites_owner" ON public."Favorite"
  FOR ALL USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "bookings_participant" ON public."Booking";
CREATE POLICY "bookings_participant" ON public."Booking"
  FOR SELECT USING (
    auth.uid()::text = "customerId"
    OR EXISTS (
      SELECT 1 FROM public."VendorProfile" vp
      WHERE vp.id = "vendorId" AND vp."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "messages_participant" ON public."Message";
DROP POLICY IF EXISTS "messages_insert_sender" ON public."Message";
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

-- Published vendor profiles readable by anyone (marketplace)
DROP POLICY IF EXISTS "vendor_profiles_public_read" ON public."VendorProfile";
CREATE POLICY "vendor_profiles_public_read" ON public."VendorProfile"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "vendor_profiles_owner_manage" ON public."VendorProfile";
CREATE POLICY "vendor_profiles_owner_manage" ON public."VendorProfile"
  FOR ALL USING (auth.uid()::text = "userId");

-- Categories are public catalog data
DROP POLICY IF EXISTS "categories_public_read" ON public."Category";
CREATE POLICY "categories_public_read" ON public."Category"
  FOR SELECT USING (true);

-- Reviews: public read
DROP POLICY IF EXISTS "reviews_public_read" ON public."Review";
CREATE POLICY "reviews_public_read" ON public."Review"
  FOR SELECT USING (true);

-- Portfolio media: public read
DROP POLICY IF EXISTS "portfolio_public_read" ON public."PortfolioMedia";
CREATE POLICY "portfolio_public_read" ON public."PortfolioMedia"
  FOR SELECT USING (true);

-- Notifications: owner only
DROP POLICY IF EXISTS "notifications_owner" ON public."Notification";
CREATE POLICY "notifications_owner" ON public."Notification"
  FOR ALL USING (auth.uid()::text = "userId");

-- Push subscriptions: owner only
DROP POLICY IF EXISTS "push_subscriptions_owner" ON public."PushSubscription";
CREATE POLICY "push_subscriptions_owner" ON public."PushSubscription"
  FOR ALL USING (auth.uid()::text = "userId");

-- Rewards wallet / transactions: owner only
DROP POLICY IF EXISTS "rewards_wallet_owner" ON public."RewardsWallet";
CREATE POLICY "rewards_wallet_owner" ON public."RewardsWallet"
  FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "reward_tx_owner" ON public."RewardTransaction";
CREATE POLICY "reward_tx_owner" ON public."RewardTransaction"
  FOR SELECT USING (auth.uid()::text = "userId");

-- Conversations: participants only
DROP POLICY IF EXISTS "conversations_participant" ON public."Conversation";
CREATE POLICY "conversations_participant" ON public."Conversation"
  FOR SELECT USING (
    auth.uid()::text = "customerId"
    OR EXISTS (
      SELECT 1 FROM public."VendorProfile" vp
      WHERE vp.id = "vendorId" AND vp."userId" = auth.uid()::text
    )
  );

-- Sensitive tables intentionally have NO policies for anon/authenticated:
-- Payment, Payout, Withdrawal, AuditLog, Dispute*, VerificationRequest,
-- Subscription, QuoteRequest, BusinessCustomer, VendorStaff, BlockedDate,
-- AnalyticsEvent, VenueDetails
-- → blocked via PostgREST; Prisma (server) still has full access.
