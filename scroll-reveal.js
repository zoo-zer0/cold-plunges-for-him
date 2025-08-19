document.addEventListener("DOMContentLoaded", () => {

  const images = document.querySelectorAll('.image-container');

  const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
          if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observer.unobserve(entry.target); // only animate once
          }
      });
  }, { threshold: 0.3 });

  images.forEach(image => observer.observe(image));
});