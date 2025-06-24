import CTABanner from "@/components/cta-banner";
import FAQ from "@/components/faq";
import Promise from "@/components/promise";
import Footer from "@/components/footer";
import Hero from "@/components/hero";
import { Navbar } from "@/components/navbar";
import Testimonials from "@/components/testimonials";

export default function Home() {
    return (
        <>
            <Navbar />
            <main className="pt-16 xs:pt-20 sm:pt-24">
                <Hero />
                <Promise />
                <FAQ />
                <Testimonials />
                <CTABanner />
                <Footer />
            </main>
        </>
    );
}
