document.addEventListener("DOMContentLoaded", () => {
  const scrollBtn = document.querySelector(".js-scroll-top");

  if (!scrollBtn) return;

  const toggleScrollBtn = () => {
    if (window.scrollY > 150) {
      scrollBtn.classList.add("show");
    } else {
      scrollBtn.classList.remove("show");
    }
  };

  window.addEventListener("scroll", toggleScrollBtn, { passive: true });

  toggleScrollBtn();

  scrollBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
});
