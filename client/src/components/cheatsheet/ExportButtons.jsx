import { useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

async function waitForFontsAndImages(node) {
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready } catch (e) { /* ignore */ }
  }
  // Wait for any <img> children to finish loading
  const imgs = node.querySelectorAll('img')
  await Promise.all(
    Array.from(imgs).map(img => img.complete ? null : new Promise(r => {
      img.onload = img.onerror = r
    }))
  )
}

async function captureNode(node, scale = 2) {
  return html2canvas(node, {
    scale,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false
  })
}

function safeFilename(name) {
  return (name || 'phao-cuu-cap')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'phao-cuu-cap'
}

export default function ExportButtons({ targetRef, fileName }) {
  const [busy, setBusy] = useState(null)

  const exportPNG = async () => {
    const node = targetRef.current
    if (!node) return
    setBusy('png')
    try {
      await waitForFontsAndImages(node)
      const canvas = await captureNode(node, 2)
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${safeFilename(fileName)}.png`
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
    } finally {
      setBusy(null)
    }
  }

  const exportPDF = async () => {
    const node = targetRef.current
    if (!node) return
    setBusy('pdf')
    try {
      await waitForFontsAndImages(node)
      // Capture the whole renderer in one go (same as PNG export), then make a
      // PDF whose single page matches the captured aspect ratio — looks like a
      // poster, not a chopped multi-page doc.
      const canvas = await captureNode(node, 2)
      const imgData = canvas.toDataURL('image/png')

      // Map captured pixel dimensions to PDF mm at ~96 DPI (1px = 0.264583mm).
      // Divide by the html2canvas scale (2x) so the final mm size matches the
      // on-screen layout instead of being 2× too large.
      const PX_TO_MM = 0.264583 / 2
      const pageW = canvas.width * PX_TO_MM
      const pageH = canvas.height * PX_TO_MM

      const pdf = new jsPDF({
        orientation: pageW >= pageH ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pageW, pageH]
      })
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH)
      pdf.save(`${safeFilename(fileName)}.pdf`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="cs-export-buttons">
      <button className="btn btn-secondary" onClick={exportPNG} disabled={busy !== null}>
        {busy === 'png' ? 'Đang xuất...' : '🖼️ PNG'}
      </button>
      <button className="btn btn-secondary" onClick={exportPDF} disabled={busy !== null}>
        {busy === 'pdf' ? 'Đang xuất...' : '📄 PDF'}
      </button>
    </div>
  )
}
