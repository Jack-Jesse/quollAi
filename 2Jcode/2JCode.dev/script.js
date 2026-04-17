document.addEventListener('DOMContentLoaded', () => {
    console.log('2JCode.dev landing page loaded!');

    // Smooth scrolling for navigation links
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Example of a simple interaction: Alert on CTA button click
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', () => {
            alert('Thanks for your interest in 2JCode.dev! More features coming soon.');
        });
    }

    // Example of handling form submission (for contact section)
    const contactForm = document.querySelector('#contact form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Your message has been sent! We will get back to you shortly.');
            this.reset(); // Clear the form
        });
    }

    // Add a simple animation for feature items on scroll (optional)
    const featureItems = document.querySelectorAll('.feature-item');
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = 1;
                entry.target.style.transform = 'translateY(0)';
            } else {
                entry.target.style.opacity = 0;
                entry.target.style.transform = 'translateY(20px)';
            }
        });
    }, observerOptions);

    featureItems.forEach(item => {
        item.style.opacity = 0;
        item.style.transform = 'translateY(20px)';
        item.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(item);
    });

    // Add a simple animation for pricing plans on scroll
    const pricingPlans = document.querySelectorAll('.pricing-plan');
    const pricingObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = 1;
                entry.target.style.transform = 'translateY(0)';
            } else {
                entry.target.style.opacity = 0;
                entry.target.style.transform = 'translateY(20px)';
            }
        });
    }, observerOptions);

    pricingPlans.forEach(plan => {
        plan.style.opacity = 0;
        plan.style.transform = 'translateY(20px)';
        plan.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        pricingObserver.observe(plan);
    });
});
