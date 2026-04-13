# IMF WEO Data Files

Place downloaded WEO tab-delimited files in this directory.

## How to download

1. Go to https://www.imf.org/en/Publications/WEO/weo-database
2. Click the latest release (e.g. "October 2025")
3. Click "Download Entire Database"
4. Download both **Tab Delimited Values** files:
   - "By Countries" → rename to `WEOOct2025all.txt`
   - "By Country Groups" → rename to `WEOOct2025alla.txt`
5. Place both files in this directory
6. Run: `npm run ingest:weo`

## Naming convention

| Vintage     | Countries file        | Groups file            |
|-------------|----------------------|------------------------|
| April 2026  | WEOApr2026all.txt    | WEOApr2026alla.txt     |
| October 2025| WEOOct2025all.txt    | WEOOct2025alla.txt     |
| April 2025  | WEOApr2025all.txt    | WEOApr2025alla.txt     |

Files in this directory are gitignored (large binary-ish text files).
