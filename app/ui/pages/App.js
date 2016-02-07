import React from 'react'
import { Link } from 'react-router'

import './App.less'

export default class App extends React.Component {
  render() {
    return (
      <div id="container">
        <header id="header">
          <h1><Link to="/">iEMS</Link></h1>

          <nav>
            <ul>
              <li><Link to="/experiments" activeClassName="active">Experiments</Link></li>
              <li><Link to="/cluster" activeClassName="active">Cluster</Link></li>
            </ul>
          </nav>
        </header>

        <main>
          {this.props.children}
        </main>
      </div>
    )
  }
}
