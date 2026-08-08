<?xml version="1.0" encoding="UTF-8"?>
<!--
  Human-facing rendering of /sitemap.xml, referenced by the
  xml-stylesheet processing instruction in app/sitemap.xml/route.ts.
  Search engines never request this file; it exists so a person who
  opens the sitemap sees a table instead of run-together XML text.
  Colours mirror lib/site.ts PALETTE (sand / ink / brass / coal) —
  keep in sync by hand, XSLT cannot import them.
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
        <meta name="robots" content="noindex" />
        <style>
          :root {
            --sand: #e9ebee;
            --ink: #14171b;
            --ink-soft: rgba(20, 23, 27, 0.62);
            --brass: #8d7448;
            --line: rgba(20, 23, 27, 0.14);
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --sand: #0d0e10;
              --ink: #e9ebee;
              --ink-soft: rgba(233, 235, 238, 0.62);
              --line: rgba(233, 235, 238, 0.16);
            }
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: var(--sand);
            color: var(--ink);
            font: 15px/1.6 ui-sans-serif, system-ui, "Segoe UI", sans-serif;
          }
          .wrap { max-width: 1080px; margin: 0 auto; padding: 56px 24px 96px; }
          .kicker {
            margin: 0 0 8px;
            color: var(--brass);
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.32em;
            text-transform: uppercase;
          }
          h1 {
            margin: 0 0 12px;
            font: 400 clamp(28px, 5vw, 44px)/1.1 ui-serif, Georgia, serif;
            letter-spacing: -0.01em;
          }
          .note { margin: 0 0 40px; max-width: 60ch; color: var(--ink-soft); }
          .note strong { color: var(--ink); font-weight: 600; }
          .scroll { overflow-x: auto; }
          table { width: 100%; border-collapse: collapse; }
          th {
            padding: 10px 14px;
            border-bottom: 1px solid var(--ink);
            color: var(--ink-soft);
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.18em;
            text-align: left;
            text-transform: uppercase;
            white-space: nowrap;
          }
          td {
            padding: 10px 14px;
            border-bottom: 1px solid var(--line);
            white-space: nowrap;
          }
          td.url { width: 100%; }
          a { color: inherit; text-decoration: none; }
          td.url a:hover { color: var(--brass); text-decoration: underline; }
          .lang {
            display: inline-block;
            margin-right: 6px;
            padding: 1px 8px;
            border: 1px solid var(--line);
            border-radius: 999px;
            color: var(--ink-soft);
            font-size: 11px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .lang:hover { border-color: var(--brass); color: var(--brass); }
          .num { text-align: right; font-variant-numeric: tabular-nums; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <p class="kicker">Kencho Group</p>
          <h1>XML Sitemap</h1>
          <p class="note">
            This file tells search engines which pages exist on
            kenchogroup.ge — it is meant for crawlers, not visitors.
            It currently lists
            <strong><xsl:value-of select="count(s:urlset/s:url)" /> URLs</strong>.
          </p>
          <div class="scroll">
            <table>
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Languages</th>
                  <th>Last modified</th>
                  <th>Frequency</th>
                  <th class="num">Priority</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="s:urlset/s:url">
                  <tr>
                    <td class="url">
                      <a href="{s:loc}"><xsl:value-of select="s:loc" /></a>
                    </td>
                    <td>
                      <xsl:for-each select="xhtml:link[@hreflang != 'x-default']">
                        <a class="lang" href="{@href}">
                          <xsl:value-of select="@hreflang" />
                        </a>
                      </xsl:for-each>
                    </td>
                    <td><xsl:value-of select="substring(s:lastmod, 1, 10)" /></td>
                    <td><xsl:value-of select="s:changefreq" /></td>
                    <td class="num"><xsl:value-of select="s:priority" /></td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
