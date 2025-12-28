class CustomNavbar extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                .navbar {
                    background-color: #ef4444;
                    color: white;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                }
                .navbar-container {
                    max-width: 100%;
                    margin: 0 auto;
                    padding: 0.75rem 1rem;
                }
                
                @media (max-width: 767px) {
                    .navbar-container {
                        padding: 0.5rem;
                    }
                    
                    .navbar-brand {
                        font-size: 1rem;
                    }
                }
.navbar-brand {
                    display: flex;
                    align-items: center;
                    font-weight: 600;
                    font-size: 1.25rem;
                }
                
                .navbar-brand i {
                    margin-right: 0.5rem;
                }
            </style>
            <nav class="navbar">
                <div class="navbar-container">
                    <div class="navbar-brand">
                        <i data-feather="alert-triangle"></i>
                        BFP Sta. Cruz
</div>
                </div>
            </nav>
        `;
    }
}

customElements.define('custom-navbar', CustomNavbar);