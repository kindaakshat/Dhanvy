import { PaymentProvider, PaymentGatewayType } from './paymentProvider.interface';
import { simulatedGateway } from './simulatedGateway.service';
import { razorpayProvider } from './razorpayProvider.service';

export class PaymentGatewayFactory {
  private static defaultProviderType: PaymentGatewayType = 'SIMULATED';

  /**
   * Set the active default payment provider for the reliability layer.
   */
  public static setDefaultProvider(type: PaymentGatewayType) {
    this.defaultProviderType = type;
  }

  /**
   * Get the active payment provider implementing the PaymentProvider interface contract.
   */
  public static getProvider(type?: PaymentGatewayType): PaymentProvider {
    const selected = type || this.defaultProviderType;

    switch (selected) {
      case 'RAZORPAY':
        return razorpayProvider;
      case 'SIMULATED':
      case 'UPI':
      default:
        return simulatedGateway;
    }
  }

  /**
   * Gets the active default provider type.
   */
  public static getDefaultProviderType(): PaymentGatewayType {
    return this.defaultProviderType;
  }
}
