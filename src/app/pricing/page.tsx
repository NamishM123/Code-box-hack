import { EditorialPage } from "@/components/EditorialPage";

export default function PricingPage() {
  return (
    <EditorialPage
      eyebrow="Pricing"
      title="Try the room editor with the demo room."
      intro="Sightline is currently presented as a product demonstration. Product decisions stay with you and the retailer."
      hero={{
        src: "/demo-capture/empty-room-02.png",
        alt: "An empty bedroom, the kind of room the demo starts from"
      }}
      cards={[
        {
          label: "Demo",
          title: "Explore freely",
          body: "Use the seeded room to test layouts, placement labels, and the product rail.",
          image: "/hero/hero-poster.jpg",
          alt: "A furnished dining room produced in the room editor"
        },
        {
          label: "Saved rooms",
          title: "Stored locally",
          body: "Rooms you save are kept in this browser unless you share a generated link.",
          image: "/demo-capture/empty-room-03.png",
          alt: "An empty room photographed toward the door, saved as a starting point"
        },
        {
          label: "Listings",
          title: "Your decision",
          body: "Follow source links to review current retailer information before you buy.",
          image: "/demo-products/brass-lamp.png",
          alt: "A brass table lamp on a plain ground"
        }
      ]}
    />
  );
}
