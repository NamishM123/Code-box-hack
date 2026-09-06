import { EditorialPage } from "@/components/EditorialPage";

/**
 * Only empty-room-02 and -03 are real photographs. The other four files in
 * /public/demo-capture are flat synthetic diagrams that exist for the capture
 * demo's six-photo grid; on a marketing page they read as placeholder art, so
 * the imagery here is drawn from the photographs and the product shots only.
 */
export default function HowItWorksPage() {
  return (
    <EditorialPage
      eyebrow="The method"
      title="Six photos, then a room you can edit."
      intro="The workflow is deliberately small: provide enough visual context to start, adjust anything uncertain, and make decisions in the canvas."
      action="Start capture"
      href="/capture"
      hero={{
        src: "/demo-capture/empty-room-02.png",
        alt: "An empty bedroom photographed square on to the window wall, before anything is placed in it"
      }}
      cards={[
        {
          label: "01",
          title: "Capture",
          body: "Upload six clear photos or use the seeded demo room.",
          image: "/demo-capture/empty-room-03.png",
          alt: "An empty room photographed toward the door"
        },
        {
          label: "02",
          title: "Confirm",
          body: "Review the room estimate and only confirm a dimension if it needs correction.",
          image: "/demo-products/linen-sofa.png",
          alt: "A linen sofa, the kind of piece that has to be measured against the room"
        },
        {
          label: "03",
          title: "Canvas",
          body: "Arrange blocks, compare products, and save the room in this browser.",
          image: "/hero/hero-poster.jpg",
          alt: "A furnished dining room, the result of arranging a room in the canvas"
        }
      ]}
    />
  );
}
