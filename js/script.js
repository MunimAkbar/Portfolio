document.addEventListener('DOMContentLoaded', () => {

    // --- Initialize AOS (Animate On Scroll) ---
    AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 50
    });

    // --- Typed.js Effect ---
    new Typed('#typed', {
        strings: [
            'Retrieving context for LLM inference...',
            'Processing large-scale data pipelines...',
            'Deploying machine learning models...',
            'Munim Akbar — AI/ML Engineer'
        ],
        typeSpeed: 40,
        backSpeed: 20,
        startDelay: 500,
        loop: true,
        showCursor: true,
        cursorChar: '▋'
    });



    // --- Particles Configuration ---
    if (document.getElementById('particles-js')) {
        particlesJS('particles-js', {
            "particles": {
                "number": { "value": 60, "density": { "enable": true, "value_area": 800 } },
                "color": { "value": "#00f2fe" }, // Matches accent color
                "shape": { "type": "circle" },
                "opacity": { "value": 0.3, "random": true },
                "size": { "value": 3, "random": true },
                "line_linked": {
                    "enable": true,
                    "distance": 150,
                    "color": "#00f2fe",
                    "opacity": 0.15,
                    "width": 1
                },
                "move": {
                    "enable": true,
                    "speed": 1.5,
                    "direction": "none",
                    "random": false,
                    "straight": false,
                    "out_mode": "out",
                    "bounce": false
                }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onhover": { "enable": true, "mode": "grab" },
                    "onclick": { "enable": true, "mode": "push" },
                    "resize": true
                },
                "modes": {
                    "grab": { "distance": 140, "line_linked": { "opacity": 1 } },
                    "push": { "particles_nb": 4 }
                }
            },
            "retina_detect": true
        });
    }

    // --- Counter Animation ---
    const counters = document.querySelectorAll('.counter');
    const speed = 100; // Lower is faster

    const observerOptions = {
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;

                const updateCount = () => {
                    const target = +counter.getAttribute('data-target');
                    const count = +counter.innerText.replace(/,/g, ''); // Handle commas if any

                    const inc = target / speed;

                    if (count < target) {
                        counter.innerText = Math.ceil(count + inc);
                        setTimeout(updateCount, 20);
                    } else {
                        counter.innerText = target;
                    }
                };

                // Store target in attribute if not present
                if (!counter.getAttribute('data-target')) {
                    counter.setAttribute('data-target', counter.innerText);
                    counter.innerText = '0';
                    updateCount();
                }

                observer.unobserve(counter); // Only run once
            }
        });
    }, observerOptions);

    counters.forEach(counter => observer.observe(counter));
});