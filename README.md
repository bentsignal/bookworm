# bookworm

bookworm is a calm, local-first workshop for a personal ebook library. Import EPUB
and PDF files, rebuild their reading order, and export clean copies for an
e-reader.

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

bookworm is local-first. On iOS, its Documents directory is exposed in Files as the
bookworm folder. Imported originals live under `Library/<book-id>/` and are never
overwritten; generated editions are written alongside them as new files.
