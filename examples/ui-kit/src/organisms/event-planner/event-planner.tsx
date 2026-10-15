import { Component, Host, h, Prop, State, Event, EventEmitter } from '@stencil/core';

@Component({
  tag: 'pop-event-planner',
  encapsulation: { type: 'shadow' },
  styleUrl: 'event-planner.css',
})
export class EventPlanner {
  @Prop() titleText: string = 'Plan';
  @Prop() editable: boolean = false;
  @Prop() initialName: string = '';
  @Prop() initialNotes: string = '';
  @Prop() initialAddress: string = '';
  @Prop() initialDatetime: string = '';
  @Prop() mapsApiKey: string = '';

  @State() name: string;
  @State() notes: string;
  @State() address: string;
  @State() datetime: string;
  @State() isEditing: boolean = false;

  @Event() planSaved: EventEmitter<{ name: string, notes: string, address: string, datetime: string }>;

  componentWillLoad() {
      this.name = this.initialName;
      this.notes = this.initialNotes;
      this.address = this.initialAddress;
      this.datetime = this.initialDatetime;
  }

  private handleSave = () => {
      this.isEditing = false;
      this.planSaved.emit({
          name: this.name,
          notes: this.notes,
          address: this.address,
          datetime: this.datetime
      });
  }

  private handleEdit = () => {
      this.isEditing = true;
  }

  render() {
    const isEditing = this.editable && this.isEditing;
    const hasData = this.name || this.notes || this.address || this.datetime;

    return (
      <Host>
        <div class="planner-card">
            <div class="planner-header">
                <h3>{this.titleText}</h3>
                {this.editable && !isEditing && (
                    <button class="edit-btn" onClick={this.handleEdit}>
                        {hasData ? 'Edit' : 'Set Plan'}
                    </button>
                )}
            </div>

            {isEditing ? (
                <div class="planner-form">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" value={this.name} onInput={(e: any) => this.name = e.target.value} placeholder="Event Name" />
                    </div>
                    <div class="form-group">
                        <label>Date & Time</label>
                        <input type="datetime-local" value={this.datetime} onInput={(e: any) => this.datetime = e.target.value} />
                    </div>
                    <div class="form-group">
                        <label>Location</label>
                        <pop-address-autocomplete 
                            apiKey={this.mapsApiKey} 
                            value={this.address}
                            onAddressSelected={(e) => this.address = e.detail.address}
                        ></pop-address-autocomplete>
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea value={this.notes} onInput={(e: any) => this.notes = e.target.value} placeholder="Any special notes?"></textarea>
                    </div>
                    <div class="form-actions">
                        <button class="save-btn" onClick={this.handleSave}>Save</button>
                    </div>
                </div>
            ) : (
                <div class="planner-view">
                    {!hasData ? (
                        <p class="empty-state">No plans set yet.</p>
                    ) : (
                        <div class="plan-details">
                            {this.name && <h4>{this.name}</h4>}
                            {this.datetime && (
                                <div class="detail-row">
                                    <span class="icon">📅</span>
                                    <span>{new Date(this.datetime).toLocaleString()}</span>
                                </div>
                            )}
                            {this.address && (
                                <div class="detail-row">
                                    <span class="icon">📍</span>
                                    <span>{this.address}</span>
                                </div>
                            )}
                            {this.notes && (
                                <div class="detail-row">
                                    <span class="icon">📝</span>
                                    <p>{this.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
      </Host>
    );
  }
}
