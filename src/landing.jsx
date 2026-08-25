// The public page's entry point. Separate from main.jsx because the landing is
// the one thing outside the login, and a host can only enforce that at the file
// level — see the comment at the top of src/views/Landing.jsx.

import React from 'react'
import ReactDOM from 'react-dom/client'
import Landing from './views/Landing.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Landing />
  </React.StrictMode>
)
