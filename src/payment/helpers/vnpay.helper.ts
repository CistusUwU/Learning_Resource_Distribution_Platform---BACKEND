import * as crypto from 'crypto';
import * as qs from 'qs';

export class VNPayHelper {

    private static sortObject(
        obj: Record<string, string>
    ): Record<string, string> {
        const sorted: Record<string, string> = {};
        const encodedKeys: string[] = [];

        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                encodedKeys.push(encodeURIComponent(key));
            }
        }

        encodedKeys.sort();

        for (const encodedKey of encodedKeys) {
            const decodedKey = decodeURIComponent(encodedKey);
            sorted[encodedKey] = encodeURIComponent(String(obj[decodedKey])).replace(/%20/g, '+');
        }

        return sorted;
    }

    private static createSignature(
        params: Record<string, string>,
        hashSecret: string
    ): string {
        const sorted = this.sortObject(params);
        const signData = qs.stringify(sorted, { encode: false });

        return crypto
            .createHmac('sha512', hashSecret)
            .update(Buffer.from(signData, 'utf-8'))
            .digest('hex');
    }

    static formatDate(date: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return (
            date.getFullYear().toString() +
            pad(date.getMonth() + 1) +
            pad(date.getDate()) +
            pad(date.getHours()) +
            pad(date.getMinutes()) +
            pad(date.getSeconds())
        );
    }

    static buildPaymentUrl(params: {
        tmnCode: string;
        hashSecret: string;
        vnpayUrl: string;
        returnUrl: string;
        orderId: string;
        amount: number;
        ipAddr: string;
    }): string {
        const now = new Date();

        const vnpParams: Record<string, string> = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: params.tmnCode,
            vnp_Amount: String(params.amount * 100),
            vnp_CurrCode: 'VND',
            vnp_TxnRef: params.orderId,
            vnp_OrderInfo: `Thanh toan don hang ${params.orderId}`,
            vnp_OrderType: 'other',
            vnp_ReturnUrl: params.returnUrl,
            vnp_IpAddr: params.ipAddr,
            vnp_CreateDate: this.formatDate(now),
            vnp_ExpireDate: this.formatDate(
                new Date(now.getTime() + 15 * 60 * 1000)
            ),
            vnp_Locale: 'vn',
        };

        const sorted = this.sortObject(vnpParams);
        const signData = qs.stringify(sorted, { encode: false });
        const secureHash = this.createSignature(vnpParams, params.hashSecret);

        return `${params.vnpayUrl}?${signData}&vnp_SecureHash=${secureHash}`;
    }

    static verifySignature(
        query: Record<string, string>,
        hashSecret: string
    ): boolean {
        const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;

        if (!vnp_SecureHash) return false;

        const signed = this.createSignature(rest, hashSecret);

        return signed.toLowerCase() === vnp_SecureHash.toLowerCase();
    }
}