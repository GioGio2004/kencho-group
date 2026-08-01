/*
 * Placeholder project data — titles, locations, and descriptions are
 * stand-ins, and imagery is Unsplash placeholder photography until Kencho
 * Group's real portfolio photos arrive (swap src values 1:1).
 * `side` controls which half holds the pinned viewer (abvtek-style
 * alternation per project).
 */

export type ProjectImage = {
  id: string;
  src: string;
  alt: string;
};

export type Project = {
  id: string;
  title: string;
  location: string;
  description: string;
  side: "left" | "right";
  images: ProjectImage[];
};

const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`;

export const PROJECTS: Project[] = [
  {
    id: "hotel-lobby",
    title: "სასტუმროს ლობი",
    location: "თბილისი, ვაკე",
    description:
      "სრული ინტერიერის შესრულება — ხის ლამელების კედლები ჩაშენებული განათებით, მისაღების ავეჯი და ინდივიდუალური დეტალები, ესკიზიდან მონტაჟამდე.",
    side: "left",
    images: [
      {
        id: "hl-1",
        src: u("photo-1571003123894-1f0594d2b5d9"),
        alt: "სასტუმროს ლობის ინტერიერი",
      },
      {
        id: "hl-2",
        src: u("photo-1551632436-cbf8dd35adfa"),
        alt: "სასტუმროს დერეფანი",
      },
      {
        id: "hl-3",
        src: u("photo-1552566626-52f8b828add9"),
        alt: "სასადილო სივრცე",
      },
      {
        id: "hl-4",
        src: u("photo-1517248135467-4c7edcad34c4"),
        alt: "რესტორნის ინტერიერი",
      },
    ],
  },
  {
    id: "office-space",
    title: "საოფისე სივრცე",
    location: "თბილისი, საბურთალო",
    description:
      "თანამედროვე სამუშაო გარემო — საკონფერენციო მაგიდები, ჩაშენებული კარადები და აკუსტიკური ხის პანელები კომერციული სტანდარტით.",
    side: "right",
    images: [
      {
        id: "of-1",
        src: u("photo-1497366216548-37526070297c"),
        alt: "საოფისე მისაღები",
      },
      {
        id: "of-2",
        src: u("photo-1497366811353-6870744d04b2"),
        alt: "ღია საოფისე სივრცე",
      },
      {
        id: "of-3",
        src: u("photo-1524758631624-e2822e304c36"),
        alt: "საკონფერენციო ოთახი",
      },
      {
        id: "of-4",
        src: u("photo-1560448204-e02f11c3d0e2"),
        alt: "მინიმალისტური სამუშაო სივრცე",
      },
    ],
  },
  {
    id: "private-residence",
    title: "კერძო რეზიდენცია",
    location: "წყნეთი",
    description:
      "საცხოვრებელი სივრცის სრული გარემონტება — სამზარეულო, გარდერობი და საძინებლის ავეჯი ბუნებრივი მუხის ტექსტურით.",
    side: "left",
    images: [
      {
        id: "pr-1",
        src: u("photo-1556911220-bff31c812dba"),
        alt: "სამზარეულო მუქი ხის ფასადებით",
      },
      {
        id: "pr-2",
        src: u("photo-1600585154340-be6161a56a0c"),
        alt: "თანამედროვე მისაღები",
      },
      {
        id: "pr-3",
        src: u("photo-1615874959474-d609969a20ed"),
        alt: "საძინებელი ხის აქცენტებით",
      },
      {
        id: "pr-4",
        src: u("photo-1595526114035-0d45ed16cfbf"),
        alt: "გარდერობის ოთახი",
      },
    ],
  },
];
