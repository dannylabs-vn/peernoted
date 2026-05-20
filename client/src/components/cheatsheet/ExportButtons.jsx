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
      // Capture per-section so a long sheet becomes multi-page instead of 1 giant page
      const sections = node.querySelectorAll('section')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 10

      if (sections.length === 0) {
        const canvas = await captureNode(node, 2)
        const imgData = canvas.toDataURL('image/png')
        const imgWidth = pageWidth - margin * 2
        const imgHeight = (canvas.height / canvas.width) * imgWidth
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight)
      } else {
        // Title (capture the header separately if present)
        const header = node.querySelector('header')
        let first = true
        if (header) {
          const hCanvas = await captureNode(header, 2)
          const imgData = hCanvas.toDataURL('image/png')
          const imgWidth = pageWidth - margin * 2
          const imgHeight = (hCanvas.height / hCanvas.width) * imgWidth
          pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight)
          first = false
        }
        for (let i = 0; i < sections.length; i++) {
          const canvas = await captureNode(sections[i], 2)
          const imgData = canvas.toDataURL('image/png')
          const imgWidth = pageWidth - margin * 2
          const imgHeight = (canvas.height / canvas.width) * imgWidth
          if (!first) pdf.addPage()
          first = false
          let y = margin
          let remaining = imgHeight
          // If section taller than 1 page, slice it
          if (imgHeight <= pageHeight - margin * 2) {
            pdf.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight)
          } else {
            const slicePx = Math.floor(canvas.width * (pageHeight - margin * 2) / imgWidth)
            let offsetY = 0
            const sliceCanvas = document.createElement('canvas')
            sliceCanvas.width = canvas.width
            sliceCanvas.height = slicePx
            const ctx = sliceCanvas.getContext('2d')
            while (offsetY < canvas.height) {
              const h = Math.min(slicePx, canvas.height - offsetY)
              sliceCanvas.height = h
              ctx.clearRect(0, 0, sliceCanvas.width, h)
              ctx.drawImage(canvas, 0, offsetY, canvas.width, h, 0, 0, canvas.width, h)
              const sliceData = sliceCanvas.toDataURL('image/png')
              const sliceImgHeight = (h / canvas.width) * imgWidth
              if (offsetY > 0) pdf.addPage()
              pdf.addImage(sliceData, 'PNG', margin, margin, imgWidth, sliceImgHeight)
              offsetY += h
            }
          }
        }
      }

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
