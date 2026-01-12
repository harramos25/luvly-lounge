import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia', // Use latest or your preferred version
});

// PRICE IDS (REPLACE THESE WITH REAL STRIPE PRICE IDs FROM DASHBOARD)
// You can also move these to environment variables
const PRICES = {
    gold: process.env.STRIPE_PRICE_GOLD || 'price_1Q...',
    platinum: process.env.STRIPE_PRICE_PLATINUM || 'price_1Q...'
};

export async function POST(req: Request) {
    try {
        const { userId, plan } = await req.json();
        const priceId = PRICES[plan as keyof typeof PRICES];

        if (!priceId || priceId.startsWith('price_1Q...')) {
            return NextResponse.json({ error: "Stripe Price IDs not configured in .env" }, { status: 500 });
        }

        const supabase = await createClient();

        // Get user email to pre-fill Stripe
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer_email: user.email,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?checkout=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?checkout=cancel`,
            metadata: {
                userId: userId,
                plan: plan
            }
        });

        return NextResponse.json({ url: session.url });

    } catch (err: any) {
        console.error("Stripe Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
