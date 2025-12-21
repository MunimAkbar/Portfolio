document.addEventListener('DOMContentLoaded', () => {

    // --- Custom Cursor ---
    const dot = document.querySelector('.cursor-dot');
    const outline = document.querySelector('.cursor-outline');

    window.addEventListener('mousemove', (e) => {
        const posX = e.clientX;
        const posY = e.clientY;

        dot.style.left = `${posX}px`;
        dot.style.top = `${posY}px`;

        outline.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 500, fill: "forwards" });
    });

    // Cursor Hover Effect
    const links = document.querySelectorAll('a, button, .tag');
    links.forEach(link => {
        link.addEventListener('mouseenter', () => {
            outline.style.transform = 'translate(-50%, -50%) scale(1.5)';
            outline.style.backgroundColor = 'rgba(0, 242, 254, 0.1)';
        });
        link.addEventListener('mouseleave', () => {
            outline.style.transform = 'translate(-50%, -50%) scale(1)';
            outline.style.backgroundColor = 'transparent';
        });
    });

    // --- Typed.js ---
    new Typed('#typed', {
        strings: ['SYSTEM.INIT()', 'NEURAL_NET.LOADING...', 'ARCHITECTURE.V2', 'MUNIM_AKBAR.EXE'],
        typeSpeed: 60,
        backSpeed: 30,
        loop: true,
        cursorChar: '_'
    });

    // --- Counter Animation ---
    const counters = document.querySelectorAll('.counter');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = +entry.target.getAttribute('data-target');
                let count = 0;
                const increment = target / 100;

                const updateCount = () => {
                    if (count < target) {
                        count += increment;
                        entry.target.innerText = Math.ceil(count);
                        setTimeout(updateCount, 20);
                    } else {
                        entry.target.innerText = target;
                    }
                };
                updateCount();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 1 });

    counters.forEach(c => observer.observe(c));

    // --- AOS Init ---
    AOS.init({ duration: 1000, once: true });
});