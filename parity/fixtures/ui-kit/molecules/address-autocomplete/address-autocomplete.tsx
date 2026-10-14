import { Component, Host, h, Prop, State, Event, EventEmitter, Element } from '@stencil/core';

declare var google: any;

@Component({
  tag: 'pop-address-autocomplete',
  encapsulation: { type: 'shadow' },
  styleUrl: 'address-autocomplete.css',
})
export class AddressAutocomplete {
  @Element() el: HTMLElement;

  @Prop() apiKey: string;
  @Prop() value: string = '';
  @Prop() placeholder: string = 'Enter a location...';

  @State() isScriptLoaded: boolean = false;
  @State() mapUrl: string = '';

  @Event() addressSelected: EventEmitter<{ address: string, lat?: number, lng?: number, placeId?: string }>;

  private inputEl: HTMLInputElement;
  private autocomplete: any;

  componentDidLoad() {
    this.loadGoogleMapsScript();
    if (this.value) {
        this.updateMapPreview(this.value);
    }
  }

  private loadGoogleMapsScript() {
    if ((window as any).google && (window as any).google.maps) {
      this.isScriptLoaded = true;
      this.initAutocomplete();
      return;
    }

    if (!this.apiKey) {
      console.warn('Google Maps API key not provided to pop-address-autocomplete');
      return;
    }

    if (document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`)) {
        const checkInterval = setInterval(() => {
            if ((window as any).google && (window as any).google.maps) {
                clearInterval(checkInterval);
                this.isScriptLoaded = true;
                this.initAutocomplete();
            }
        }, 100);
        return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.isScriptLoaded = true;
      this.initAutocomplete();
    };
    document.head.appendChild(script);
  }

  private initAutocomplete() {
    if (!this.inputEl || !this.isScriptLoaded) return;

    this.autocomplete = new google.maps.places.Autocomplete(this.inputEl, {
      types: ['establishment', 'geocode'],
    });

    this.autocomplete.addListener('place_changed', () => {
      const place = this.autocomplete.getPlace();
      let address = this.inputEl.value;
      let lat, lng;
      
      if (place.geometry && place.geometry.location) {
        lat = place.geometry.location.lat();
        lng = place.geometry.location.lng();
        this.updateMapPreview(address, lat, lng);
      }

      this.addressSelected.emit({
        address: address,
        lat: lat,
        lng: lng,
        placeId: place.place_id
      });
    });
  }

  private updateMapPreview(address: string, lat?: number, lng?: number) {
      if (!this.apiKey) return;
      
      let query = '';
      if (lat && lng) {
          query = `${lat},${lng}`;
      } else if (address) {
          query = encodeURIComponent(address);
      } else {
          this.mapUrl = '';
          return;
      }
      
      this.mapUrl = `https://www.google.com/maps/embed/v1/place?key=${this.apiKey}&q=${query}`;
  }

  private handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      this.value = target.value;
      if (!target.value) {
          this.mapUrl = '';
          this.addressSelected.emit({ address: '' });
      }
  }

  render() {
    return (
      <Host>
        <div class="autocomplete-container">
            <input
            type="text"
            placeholder={this.placeholder}
            value={this.value}
            ref={(el) => (this.inputEl = el)}
            onInput={this.handleInput}
            class="address-input"
            />
            {this.mapUrl && (
                <div class="map-preview">
                    <iframe
                        width="100%"
                        height="200"
                        style={{ border: "0", borderRadius: "8px" }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={this.mapUrl}>
                    </iframe>
                </div>
            )}
        </div>
      </Host>
    );
  }
}
