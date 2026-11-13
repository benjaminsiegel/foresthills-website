# Forest Hills Neighborhood Association

Static website for foresthills.boston, with an illustrated neighborhood map, simulated traffic, and classic Mac-style information windows.

Open index.html locally or serve this directory with a static HTTP server. GitHub Pages publishes the main branch root.

Map data © OpenStreetMap contributors: https://www.openstreetmap.org/copyright
ChicagoFLF by Robin Casady is public domain; see fonts/LICENSE.txt.

The directory contains only public website assets.


The map loads visible 512-pixel lossless WebP tiles at original resolution. Tiles overlap by one pixel to avoid cracks at fractional zoom. Generate and verify them with `python3 scripts/tile-map.py /path/to/original-map.webp` (Pillow required). The full source image is retained outside the published checkout. Mobile has top and bottom navigation, bounded finger panning, and no association status footer.
