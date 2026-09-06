import { EditorialPage } from "@/components/EditorialPage";

export default function ProductPage() {
  return (
    <EditorialPage
      eyebrow="The product"
      title="A room editor for considered decisions."
      intro="Sightline turns a short set of room photos into an editable plan you can test before you follow a product link."
      gallery={[
        {
          src: "/sketches/room-study-01.svg",
          alt: "Ink study of a living room with a pendant lamp and fireplace",
          caption: "Study 01 · Ink and wash"
        },
        {
          src: "/sketches/room-study-02.svg",
          alt: "Line drawing of a seating group beneath a ring pendant",
          caption: "Study 02 · Line"
        }
      ]}
    />
  );
}
