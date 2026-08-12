import type { BookSection } from "@worm/ebook-core";

export interface SectionOrganizerProps {
  onChange: (sections: BookSection[]) => void;
  sections: BookSection[];
}
