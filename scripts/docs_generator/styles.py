COMMON_CSS = """
@font-face {
  font-family: 'Times New Roman';
  src: url('/home/juan/.local/share/fonts/times/Tinos-Regular.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: 'Times New Roman';
  src: url('/home/juan/.local/share/fonts/times/Tinos-Bold.ttf') format('truetype');
  font-weight: bold;
  font-style: normal;
}
@font-face {
  font-family: 'Times New Roman';
  src: url('/home/juan/.local/share/fonts/times/Tinos-Italic.ttf') format('truetype');
  font-weight: normal;
  font-style: italic;
}
@font-face {
  font-family: 'Times New Roman';
  src: url('/home/juan/.local/share/fonts/times/Tinos-BoldItalic.ttf') format('truetype');
  font-weight: bold;
  font-style: italic;
}

* {
  box-sizing: border-box;
  color: #000000 !important;
}

body {
  font-family: 'Times New Roman', Times, 'Tinos', serif;
  font-size: 11pt;
  line-height: 1.4;
  color: #000000;
  background-color: #ffffff;
  margin: 0;
  padding: 0;
}

.doc-header {
  text-align: center;
  border-bottom: 1.5px solid #000000;
  padding-bottom: 8px;
  margin-bottom: 14px;
}

.doc-title {
  font-size: 15pt;
  font-weight: bold;
  text-transform: uppercase;
  margin: 0 0 4px 0;
}

.doc-subtitle {
  font-size: 11.5pt;
  font-weight: bold;
  margin: 0 0 6px 0;
}

.doc-meta {
  font-size: 10pt;
  margin: 0;
}

h1 {
  font-size: 12.5pt;
  font-weight: bold;
  text-transform: uppercase;
  border-bottom: 1px solid #000000;
  padding-bottom: 2px;
  margin-top: 14px;
  margin-bottom: 6px;
  page-break-after: avoid;
  break-after: avoid;
}

h2 {
  font-size: 11.5pt;
  font-weight: bold;
  margin-top: 10px;
  margin-bottom: 4px;
  page-break-after: avoid;
  break-after: avoid;
}

h3 {
  font-size: 11pt;
  font-weight: bold;
  font-style: italic;
  margin-top: 8px;
  margin-bottom: 3px;
  page-break-after: avoid;
  break-after: avoid;
}

p {
  margin: 0 0 6px 0;
  text-align: justify;
}

ul, ol {
  margin: 0 0 6px 0;
  padding-left: 20px;
}

li {
  margin-bottom: 2px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 6px 0 10px 0;
  font-size: 9.5pt;
  page-break-inside: auto;
}

tr {
  page-break-inside: avoid;
  break-inside: avoid;
}

th {
  background-color: #f2f2f2;
  color: #000000;
  font-weight: bold;
  border: 1px solid #000000;
  padding: 4px 6px;
  text-align: left;
}

td {
  border: 1px solid #000000;
  padding: 3.5px 6px;
  vertical-align: top;
}

.text-center {
  text-align: center;
}

pre {
  background-color: #fafafa;
  border: 1px solid #000000;
  padding: 5px 8px;
  font-family: 'Times New Roman', Courier, monospace;
  font-size: 9pt;
  line-height: 1.3;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 5px 0;
}

code {
  font-family: 'Times New Roman', Courier, monospace;
  font-size: 9.5pt;
}

.endpoint-block {
  margin-bottom: 12px;
  page-break-inside: avoid;
  break-inside: avoid;
}

.endpoint-title {
  font-weight: bold;
  margin-bottom: 3px;
}
"""
