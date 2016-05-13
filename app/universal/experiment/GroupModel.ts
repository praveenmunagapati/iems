import ProcessModel from './ProcessModel';

export default class GroupModel {
  public id: string;
  public type: string;
  public title: string;
  public toTitle: (arg: any) => string;
  public from: any;
  public link: any;
  public groups: GroupModel[];
  public processes: ProcessModel[];
  public links: any[];
  public parent: any;
  public doc: any;
  public ports: any;
  public selected: any;
  public x: any;
  public y: any;
  public collapsed: any;
  
  constructor(obj, parent, doc) {
    this.groups = [];
    this.processes = [];
    this.links = [];
    this.parent = parent;
    this.doc = doc;

    for (var key in obj) {
      this[key] = obj[key];
    }

    this.groups.forEach((g, index) => this.groups[index] = new GroupModel(g, this, doc));
    this.processes.forEach((p, index) => this.processes[index] = new ProcessModel(p, this));
  }

  getKey(): string {
    return (this.parent ? this.parent.getKey() : '') + this.type + this.id;
  }

  getTitle(): string {
    if (this.toTitle) return this.toTitle(this);
    if (this.title) return this.title;
    return this.type;
  }

  getPorts() {
    return this.ports || [];
  }

  getMaxId() {
    var gmax = Math.max.apply(null, this.groups.map(g => g.id));
    var pmax = Math.max.apply(null, this.processes.map(p => p.id));
    return Math.max.apply(null, [this.id, gmax, pmax]);
  }

  addGroup(group) {
    var g = new GroupModel(group, this, this.doc);

    g.links.forEach(l => {
      if (!l.from.id) l.from.id = group.id;
      if (!l.to.id) l.to.id = group.id;
    });

    this.groups.push(g);
  }

  addProcess(process) {
    this.processes.push(new ProcessModel(process, this));
  }

  deleteSelected() {
    // remove selected items
    this.groups.filter(g => g.selected).slice().forEach(g => this.deleteGroup(g));
    this.processes.filter(p => p.selected).slice().forEach(p => this.deleteProcess(p));
    this.links.filter(l => l.selected).slice().forEach(l => this.deleteLink(l));
    // if anything is selected in subgroups, delete it as well
    this.groups.forEach(g => g.deleteSelected());
  }

  deleteGroup(group) {
    this.groups.splice(this.groups.indexOf(group), 1);
    this.links.slice().forEach(l => {
      if (l.from.id == group.id || l.to.id == group.id) {
        this.deleteLink(l);
      }
    });
  }

  deleteProcess(process) {
    this.processes.splice(this.processes.indexOf(process), 1);
    this.links.slice().forEach(l => {
      if (l.from.id == process.id || l.to.id == process.id) {
        this.deleteLink(l);
      }
    });
  }

  deleteLink(link) {
    this.links.splice(this.links.indexOf(link), 1);
  }

  getSize() {
    if (this.collapsed) {
      return this.getCollapsedSize();
    } else {
      return this.getCalculatedSize();
    }
  }

  getCollapsedSize() {
    return { width: 150, height: 50 };
  }

  getCalculatedSize() {
    var size = { width: 0, height: 0 };
    var padding = { x: 20, y: 50 };
    this.groups.forEach(g => {
      var groupSize = g.collapsed ? g.getSize() : g.getCalculatedSize();
      if (g.x + groupSize.width + padding.x > size.width) size.width = g.x + groupSize.width + padding.x;
      if (g.y + groupSize.height + padding.y > size.height) size.height = g.y + groupSize.height + padding.y;
    });
    this.processes.forEach(p => {
      var pSize = p.getSize();
      if (p.x + pSize.width + padding.x > size.width) size.width = p.x + pSize.width + padding.x;
      if (p.y + pSize.height + padding.y > size.height) size.height = p.y + pSize.height + padding.y;
    });
    if (size.width <= 0) size.width = 150;
    if (size.height <= 0) size.height = 50;
    return size;
  }

  getChildById(id) {
    if (this.id == id) return this;
    return this.processes.filter(p => p.id == id)[0] || this.groups.filter(g => g.id == id)[0];
  }

  resolveLinkInput(link) {
    if (link.from) {
      if (link.from.id == this.id) {
        return this.parent.resolveLinkInput({ to: link.from });
      } else {
        var child = this.processes.filter(p => p.id == link.from.id)[0];
        if (child) {
          return { process: child, port: link.from.port };
        }
        var child2 = this.groups.filter(g => g.id == link.from.id)[0];
        if (child2) {
          return child2.resolveLinkInput({ to: link.from });
        }
      }
    } else {
      var linkTo = this.links.filter(l => l.to.id == link.to.id && l.to.port == link.to.port)[0];
      if (linkTo) {
        return this.resolveLinkInput(linkTo);
      }
    }
    return;
  }

  resolveLinkOutput(from) {
    var links = this.links
      .filter(l => l.from.id == from.id && l.from.port == from.port)
      .map(l => this.getChildById(l.to.id));

    return [].concat.apply([], links);
  }

  getStatus() {
    if (this.processes.filter(p => p.getStatus() == 'running').length > 0) return 'running';
    if (this.processes.filter(p => p.getStatus() == 'done').length == this.processes.length) return 'done';
  }
}