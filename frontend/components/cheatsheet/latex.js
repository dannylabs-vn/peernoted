import katex from 'katex';

export function renderLatex(latex, displayMode = false) {
  try {
    return katex.renderToString(latex || '', {
      throwOnError: false,
      displayMode,
      output: 'html'
    });
  } catch (e) {
    return `<span class="latex-error">${latex}</span>`;
  }
}
