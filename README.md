# Portfolio

## How to Run Locally

Since you have Python installed, the easiest way to run this project is using Python's simple HTTP server.

1.  Open your terminal in this directory.
2.  Run the command:
    ```bash
    python -m http.server
    ```
3.  Open your web browser and go to: [http://localhost:8000](http://localhost:8000)

## Quick Fixes/Notes

-   **Email Link**: Ensure the "Send Message" link in `index.html` starts with `mailto:` (e.g., `<a href="mailto:munimakbar113@gmail.com"...>`) so it opens the email client correctly. The clickability issue has been fixed in the CSS.
