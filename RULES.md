# SitePlanner Project Rules

## CSS and Styling
1. **Avoid Ad-Hoc Inline Overrides:** Do not "muck up" the CSS with ad-hoc inline style overrides. 
2. **Fix Global Rules:** Fix the global CSS rules instead of patching specific components. This maximizes flexibility and options across the application.
3. **Prevent Unpredictable Issues:** Avoid hardcoding overrides that cause unpredictable, difficult-to-debug layout or styling issues later down the road.

## UI and Data Model Parity
1. **Expose All Parameters:** The UI must expose all fields and parameters present in the underlying data model (e.g., Zustand state, TypeScript interfaces). Do not leave configuration options hidden in the code; if the engine supports a parameter, the user must be able to configure it via the interface.
