# Worm

Worm is a calm, local-first workshop for a personal ebook library. Import and
catalog EPUB and PDF files, rebuild PDF reading order, and export clean copies
for an e-reader. EPUB structure inspection and original-file sharing are in the
first release; EPUB rewriting is the next format milestone.

The first client is an Expo React Native app for iPhone. Book-format logic lives
outside the app where possible so Android, web, and desktop clients can follow.

## Development

Requires Node.js 22 and pnpm 9.

```sh
pnpm install
pnpm ios
```

Metro runs through the stable Portless origin `https://mobile.worm.local`.

## File ownership

Worm is local-first. On iOS, its Documents directory is exposed in Files as the
Worm folder. Imported originals live under `Library/<book-id>/` and are never
overwritten; generated editions are written alongside them as new files.
