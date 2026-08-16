<?xml version="1.0" encoding="UTF-8"?>
<!--
  Human-facing rendering of /sitemap.xml, referenced by the
  xml-stylesheet processing instruction in app/sitemap.xml/route.ts.
  Search engines ignore this stylesheet and parse the raw XML;
  it exists so visitors and webmasters see a structured, clean table.
-->
<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <title>XML Sitemap — Kencho Group</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          :root {
            --sand: #e9ebee;
            --ink: #14171b;
            --ink-soft: rgba(20, 23, 27, 0.62);
            --brass: #8d7448;
            --line: rgba(20, 23, 27, 0.14);
            --card: #ffffff;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --sand: #0d0e10;
              --ink: #e9ebee;
              --ink-soft: rgba(233, 235, 238, 0.62);
              --line: rgba(233, 235, 238, 0.16);
              --card: #14171b;
            }
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: var(--sand);
            color: var(--ink);
            font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          .wrap { max-width: 1100px; margin: 0 auto; padding: 48px 24px 80px; }
          .header {
            margin-bottom: 32px;
            padding-bottom: 24px;
            border-bottom: 1px solid var(--line);
          }
          .kicker {
            margin: 0 0 8px;
            color: var(--brass);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.28em;
            text-transform: uppercase;
          }
          h1 {
            margin: 0 0 12px;
            font: 400 clamp(26px, 4vw, 38px)/1.15 Georgia, serif;
            letter-spacing: -0.01em;
          }
          .note { margin: 0; max-width: 65ch; color: var(--ink-soft); font-size: 14px; }
          .note strong { color: var(--ink); font-weight: 600; }
          .stats {
            display: inline-flex;
            gap: 16px;
            margin-top: 16px;
            padding: 8px 14px;
            background: var(--card);
            border: 1px solid var(--line);
            border-radius: 6px;
            font-size: 13px;
          }
          .stats span { color: var(--brass); font-weight: 600; }
          .table-card {
            background: var(--card);
            border: 1px solid var(--line);
            border-radius: 8px;
            overflow: hidden;
          }
          .scroll { overflow-x: auto; }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          th {
            padding: 12px 16px;
            background: rgba(141, 116, 72, 0.06);
            border-bottom: 1px solid var(--line);
            color: var(--ink-soft);
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            white-space: nowrap;
          }
          td {
            padding: 12px 16px;
            border-bottom: 1px solid var(--line);
            font-size: 13px;
            white-space: nowrap;
          }
          tr:last-child td { border-bottom: none; }
          tr:hover td { background: rgba(141, 116, 72, 0.03); }
          td.url { width: 45%; }
          a { color: inherit; text-decoration: none; }
          td.url a { font-weight: 500; }
          td.url a:hover { color: var(--brass); text-decoration: underline; }
          .lang-group { display: flex; gap: 6px; flex-wrap: wrap; }
          .lang {
            display: inline-block;
            padding: 2px 7px;
            background: rgba(141, 116, 72, 0.08);
            border: 1px solid var(--line);
            border-radius: 4px;
            color: var(--ink-soft);
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .lang:hover { border-color: var(--brass); color: var(--brass); }
          .num { text-align: right; font-variant-numeric: tabular-nums; }
          .date { color: var(--ink-soft); font-family: monospace; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="header">
            <p class="kicker">Kencho Group</p>
            <h1>XML Sitemap</h1>
            <p class="note">
              This is the official sitemap for <strong>www.kenchogroup.ge</strong> indexed by search engines.
            </p>
            <div class="stats">
              <div>Total URLs: <span><xsl:value-of select="count(s:urlset/s:url)" /></span></div>
            </div>
          </div>
          <div class="table-card">
            <div class="scroll">
              <table>
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Languages</th>
                    <th>Last Modified</th>
                    <th>Changefreq</th>
                    <th class="num">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="s:urlset/s:url">
                    <tr>
                      <td class="url">
                        <a href="{s:loc}" target="_blank" rel="noopener">
                          <xsl:value-of select="s:loc" />
                        </a>
                      </td>
                      <td>
                        <div class="lang-group">
                          <xsl:for-each select="xhtml:link[@hreflang != 'x-default']">
                            <a class="lang" href="{@href}" target="_blank" rel="noopener">
                              <xsl:value-of select="@hreflang" />
                            </a>
                          </xsl:for-each>
                        </div>
                      </td>
                      <td class="date">
                        <xsl:value-of select="substring(s:lastmod, 1, 10)" />
                      </td>
                      <td><xsl:value-of select="s:changefreq" /></td>
                      <td class="num"><xsl:value-of select="s:priority" /></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
