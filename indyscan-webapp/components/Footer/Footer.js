import React, { Component } from 'react'

class Footer extends Component {
  render () {
    return (
      <footer className="mt-8 pt-6 border-t border-border">
        <div className="text-center text-sm text-muted-foreground">
          {this.props.displayVersion && (
            <p>Indyscan Explorer version: {this.props.displayVersion}</p>
          )}
        </div>
      </footer>
    )
  }
}

export default Footer
