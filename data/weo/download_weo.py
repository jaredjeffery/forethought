#!/usr/bin/env python3
"""
Download IMF World Economic Outlook (WEO) "By Countries" datasets.

Usage:
    python download_weo.py              # download all missing editions
    python download_weo.py --force      # re-download even if file exists

Files are saved as WEOApr2024all.txt / WEOOct2024all.txt etc. in this directory.
These are tab-delimited text files (despite the .xls source extension).

FORMAT NOTE — October 2025 onwards:
  The IMF moved to a new Data Portal as of October 2025. The old .xls tab-delimited
  format is no longer published. Instead, the equivalent file is a proper .xlsx workbook
  with three sheets: "Countries", "Country Groups", and "Commodity Prices".
  This script downloads it as WEOOct2025all.xlsx.

  *** If you have a WEOOct2025all.txt (CSV portal export), DELETE IT and let this
      script download the correct Excel file instead. ***

Editions covered: 2007–2025 (older editions use a different IMF site; see notes below).
"""

import os
import sys
import time
import urllib.request
import urllib.error

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FORCE = "--force" in sys.argv

# Direct download URLs for "By Countries" datasets.
# Each entry: (year, month_label, filename, url)
#
# Oct 2025+: proper .xlsx workbook (3 sheets: Countries, Country Groups, Commodity Prices)
#            sourced from the new IMF Data Portal (data.imf.org)
# 2007–Apr 2025: tab-delimited text files with .xls extension from the old IMF site,
#                saved here as .txt
EDITIONS = [
    # --- 2025 ---
    # Oct 2025: new Data Portal Excel format (.xlsx, 3 sheets — includes country groups)
    (2025, "Oct", "WEOOct2025all.xlsx",
     "https://data.imf.org/-/media/iData/External%20Storage/Documents/5661B7CB2FCC4A56866765D4281AEF01/en/WEOOct2025all"),

    # Apr 2025: last edition on old site (tab-delimited .xls saved as .txt)
    (2025, "Apr", "WEOApr2025all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2025/april/weoapr2025all.xls"),
    (2025, "Apr", "WEOApr2025alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2025/april/weoapr2025alla.xls"),

    # --- 2024 ---
    (2024, "Oct", "WEOOct2024all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2024/october/weooct2024all.xls"),
    (2024, "Oct", "WEOOct2024alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2024/october/weooct2024alla.xls"),
    (2024, "Apr", "WEOApr2024all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2024/april/weoapr2024all.xls"),
    (2024, "Apr", "WEOApr2024alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2024/april/weoapr2024alla.xls"),

    # --- 2023 ---
    (2023, "Oct", "WEOOct2023all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2023/weooct2023all.xls"),
    (2023, "Oct", "WEOOct2023alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2023/weooct2023alla.xls"),
    (2023, "Apr", "WEOApr2023all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2023/weoapr2023all.xls"),
    (2023, "Apr", "WEOApr2023alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2023/weoapr2023alla.xls"),

    # --- 2022 ---
    (2022, "Oct", "WEOOct2022all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2022/weooct2022all.xls"),
    (2022, "Oct", "WEOOct2022alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2022/weooct2022alla.xls"),
    (2022, "Apr", "WEOApr2022all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2022/weoapr2022all.xls"),
    (2022, "Apr", "WEOApr2022alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2022/weoapr2022alla.xls"),

    # --- 2021 ---
    (2021, "Oct", "WEOOct2021all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2021/weooct2021all.xls"),
    (2021, "Oct", "WEOOct2021alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2021/weooct2021alla.xls"),
    (2021, "Apr", "WEOApr2021all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2021/weoapr2021all.xls"),
    (2021, "Apr", "WEOApr2021alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2021/weoapr2021alla.xls"),

    # --- 2020 ---
    # Note: October 2020 has an unusual /02/ subdirectory in the URL
    (2020, "Oct", "WEOOct2020all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2020/02/weooct2020all.xls"),
    (2020, "Oct", "WEOOct2020alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2020/02/weooct2020alla.xls"),
    (2020, "Apr", "WEOApr2020all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2020/weoapr2020all.xls"),
    (2020, "Apr", "WEOApr2020alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2020/weoapr2020alla.xls"),

    # --- 2019 ---
    (2019, "Oct", "WEOOct2019all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2019/weooct2019all.xls"),
    (2019, "Oct", "WEOOct2019alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2019/weooct2019alla.xls"),
    (2019, "Apr", "WEOApr2019all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2019/weoapr2019all.xls"),
    (2019, "Apr", "WEOApr2019alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2019/weoapr2019alla.xls"),

    # --- 2018 ---
    (2018, "Oct", "WEOOct2018all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2018/weooct2018all.xls"),
    (2018, "Oct", "WEOOct2018alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2018/weooct2018alla.xls"),
    (2018, "Apr", "WEOApr2018all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2018/weoapr2018all.xls"),
    (2018, "Apr", "WEOApr2018alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2018/weoapr2018alla.xls"),

    # --- 2017 ---
    (2017, "Oct", "WEOOct2017all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2017/weooct2017all.xls"),
    (2017, "Oct", "WEOOct2017alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2017/weooct2017alla.xls"),
    (2017, "Apr", "WEOApr2017all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2017/weoapr2017all.xls"),
    (2017, "Apr", "WEOApr2017alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2017/weoapr2017alla.xls"),

    # --- 2016 ---
    (2016, "Oct", "WEOOct2016all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2016/weooct2016all.xls"),
    (2016, "Oct", "WEOOct2016alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2016/weooct2016alla.xls"),
    (2016, "Apr", "WEOApr2016all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2016/weoapr2016all.xls"),
    (2016, "Apr", "WEOApr2016alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2016/weoapr2016alla.xls"),

    # --- 2015 ---
    (2015, "Oct", "WEOOct2015all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2015/weooct2015all.xls"),
    (2015, "Oct", "WEOOct2015alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2015/weooct2015alla.xls"),
    (2015, "Apr", "WEOApr2015all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2015/weoapr2015all.xls"),
    (2015, "Apr", "WEOApr2015alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2015/weoapr2015alla.xls"),

    # --- 2014 ---
    (2014, "Oct", "WEOOct2014all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2014/weooct2014all.xls"),
    (2014, "Oct", "WEOOct2014alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2014/weooct2014alla.xls"),
    (2014, "Apr", "WEOApr2014all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2014/weoapr2014all.xls"),
    (2014, "Apr", "WEOApr2014alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2014/weoapr2014alla.xls"),

    # --- 2013 ---
    (2013, "Oct", "WEOOct2013all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2013/weooct2013all.xls"),
    (2013, "Oct", "WEOOct2013alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2013/weooct2013alla.xls"),
    (2013, "Apr", "WEOApr2013all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2013/weoapr2013all.xls"),
    (2013, "Apr", "WEOApr2013alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2013/weoapr2013alla.xls"),

    # --- 2012 ---
    (2012, "Oct", "WEOOct2012all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2012/weooct2012all.xls"),
    (2012, "Oct", "WEOOct2012alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2012/weooct2012alla.xls"),
    (2012, "Apr", "WEOApr2012all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2012/weoapr2012all.xls"),
    (2012, "Apr", "WEOApr2012alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2012/weoapr2012alla.xls"),

    # --- 2011 ---
    (2011, "Oct", "WEOOct2011all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2011/weooct2011all.xls"),
    (2011, "Oct", "WEOOct2011alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2011/weooct2011alla.xls"),
    (2011, "Apr", "WEOApr2011all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2011/weoapr2011all.xls"),
    (2011, "Apr", "WEOApr2011alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2011/weoapr2011alla.xls"),

    # --- 2010 ---
    (2010, "Oct", "WEOOct2010all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2010/weooct2010all.xls"),
    (2010, "Oct", "WEOOct2010alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2010/weooct2010alla.xls"),
    (2010, "Apr", "WEOApr2010all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2010/weoapr2010all.xls"),
    (2010, "Apr", "WEOApr2010alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2010/weoapr2010alla.xls"),

    # --- 2009 ---
    (2009, "Oct", "WEOOct2009all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2009/weooct2009all.xls"),
    (2009, "Oct", "WEOOct2009alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2009/weooct2009alla.xls"),
    (2009, "Apr", "WEOApr2009all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2009/weoapr2009all.xls"),
    (2009, "Apr", "WEOApr2009alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2009/weoapr2009alla.xls"),

    # --- 2008 ---
    (2008, "Oct", "WEOOct2008all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2008/weooct2008all.xls"),
    (2008, "Oct", "WEOOct2008alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2008/weooct2008alla.xls"),
    (2008, "Apr", "WEOApr2008all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2008/weoapr2008all.xls"),
    (2008, "Apr", "WEOApr2008alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2008/weoapr2008alla.xls"),

    # --- 2007 ---
    (2007, "Oct", "WEOOct2007all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2007/weooct2007all.xls"),
    (2007, "Oct", "WEOOct2007alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2007/weooct2007alla.xls"),
    (2007, "Apr", "WEOApr2007all.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2007/weoapr2007all.xls"),
    (2007, "Apr", "WEOApr2007alla.txt",
     "https://www.imf.org/-/media/files/publications/weo/weo-database/2007/weoapr2007alla.xls"),
]

# Editions before 2007 used a different IMF site structure and are not included above.
# They can be found at: https://www.imf.org/external/pubs/ft/weo/{year}/{01 or 02}/data/
# but those pages use .ashx download links and require separate handling.

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "*/*",
    "Referer": "https://www.imf.org/",
}


def download_file(url, dest_path):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    with open(dest_path, "wb") as f:
        f.write(data)
    return len(data)


def main():
    total = len(EDITIONS)
    skipped = []
    downloaded = []
    failed = []

    print(f"\nIMF WEO Downloader — {total} editions to process")
    print(f"Output directory: {SCRIPT_DIR}\n")

    for i, (year, month, filename, url) in enumerate(EDITIONS, 1):
        dest = os.path.join(SCRIPT_DIR, filename)
        label = f"{month} {year}"

        if os.path.exists(dest) and not FORCE:
            size_kb = os.path.getsize(dest) // 1024
            print(f"[{i:2d}/{total}] SKIP  {label:10s}  {filename}  ({size_kb:,} KB already exists)")
            skipped.append(filename)
            continue

        print(f"[{i:2d}/{total}] DL    {label:10s}  {filename} ...", end=" ", flush=True)
        try:
            size = download_file(url, dest)
            size_kb = size // 1024
            print(f"OK ({size_kb:,} KB)")
            downloaded.append(filename)
            time.sleep(0.5)  # be polite to the server
        except Exception as e:
            print(f"FAILED: {e}")
            failed.append((filename, str(e)))
            # remove partial file if it exists
            if os.path.exists(dest):
                os.remove(dest)

    print(f"\n{'='*60}")
    print(f"Done. Downloaded: {len(downloaded)}  Skipped: {len(skipped)}  Failed: {len(failed)}")
    if failed:
        print("\nFailed editions:")
        for fname, err in failed:
            print(f"  {fname}: {err}")
        print("\nTip: Re-run with --force to retry failed downloads.")
    print()


if __name__ == "__main__":
    main()
