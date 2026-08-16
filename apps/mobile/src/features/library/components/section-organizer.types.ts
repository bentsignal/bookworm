import type { BookSection } from "@lib/ebook-core";

export interface SectionOrganizerProps {
  onChange: (sections: BookSection[]) => void;
  sections: BookSection[];
}
