import { EditorialPage } from "@/components/EditorialPage";

export default function ProductPage() {
  return (
    <EditorialPage
      eyebrow="The product"
      title="A room editor for considered decisions."
      intro="Sightline turns a short set of room photos into an editable plan you can test before you follow a product link."
      hero={{
        src: "/hero/hero-poster.jpg",
        alt: "A furnished dining room, oval oak table and green chairs against concrete"
      }}
      cards={[
        {
          label: "01",
          title: "Capture",
          body: "Six clear photos give the room editor a starting point. You can use the demo room at any time.",
          image: "/demo-capture/empty-room-02.png",
          alt: "An empty bedroom photographed square on to the window wall"
        },
        {
          label: "02",
          title: "Arrange",
          body: "Move furniture blocks, choose a layout, and inspect the rationale behind every placement.",
          image: "/demo-products/oak-table.png",
          alt: "A round oak dining table on a plain ground"
        },
        {
          label: "03",
          title: "Compare",
          body: "Open product links and compare listings side by side before deciding where to buy.",
          image: "/demo-products/camel-chair.png",
          alt: "A camel leather lounge chair on a plain ground"
        }
      ]}
    />
  );
}
