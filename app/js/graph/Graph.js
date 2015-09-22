var Graph = React.createClass({
  mixins: [React.addons.PureRenderMixin],

  componentDidMount: function() {
    this.refs.container.focus();
  },

  onKeyDown: function(e) {
    if (e.keyCode == 46) {
      Actions.delete();
    }
  },

  render: function() {
    var size = this.props.graph.getCalculatedSize();
    return (
      <div ref="container" onKeyDown={this.onKeyDown} style={{height: '100%'}} tabIndex="0">
        <svg style={{width: (size.width+25)+'px', height: (size.height+100)+'px'}}>
          <Select width={size.width+25} height={size.height+100}>
            {this.props.children}
          </Select>
        </svg>
      </div>
    );
  }
});
