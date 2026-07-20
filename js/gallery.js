// Gallery lightbox — click a photo to enlarge, Esc/click/× to close
(function () {
  const box = document.getElementById('lightbox');
  if (!box) return;
  const boxImg = box.querySelector('img');
  const boxCap = box.querySelector('.lightbox-caption');

  document.querySelectorAll('.gallery-item').forEach((fig) => {
    fig.addEventListener('click', () => {
      const img = fig.querySelector('img');
      const cap = fig.querySelector('figcaption');
      boxImg.src = img.src;
      boxImg.alt = img.alt;
      boxCap.textContent = cap ? cap.textContent : '';
      box.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  function close() {
    box.classList.remove('open');
    document.body.style.overflow = '';
  }
  box.addEventListener('click', (e) => { if (e.target !== boxImg) close(); });
  box.querySelector('.lightbox-close').addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();
