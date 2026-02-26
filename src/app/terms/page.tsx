import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { siteConfig } from '@/config/site';

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-white">
            <Navbar data={siteConfig.navigation.main} onOpenContact={() => { }} onShowToast={() => { }} />
            <div className="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto text-slate-900">
                <h1 className="text-4xl md:text-5xl font-bold mb-8">General Terms &amp; Conditions</h1>

                <div className="prose prose-slate max-w-none prose-headings:font-semibold prose-a:text-brand-blue">
                    <p>With a binding booking for an event organized by HumanAIx Association, a non-profit association organized under Swiss law, with its registered office at Bundesstrasse 3, 6302 Zug, Switzerland, hereinafter referred to as "HumanAIx", I accept the General Terms &amp; Conditions of HumanAIx. The booking by sponsors/partners and/or event attendees (hereinafter jointly: customers) is binding. These General Terms &amp; Conditions are valid for the booking of HumanAIx&apos;s event.</p>

                    <h2 className="text-2xl mt-8 mb-4">(1) SPONSORS AND PARTNERS</h2>
                    <h3 className="text-xl mt-6 mb-3">1.1 BOOKING, PAYMENT, AND DEFAULT OF PAYMENT</h3>
                    <p><strong>1.1.1</strong> The contract between HumanAIx and the sponsor/partner begins with the signature of the sponsorship/partnership commitment form or an equivalent agreement by both contracting parties. The sponsorship/partnership commitment form or agreement to which these General Terms &amp; Conditions are attached, regulates the respective services and compensatory payments. The sponsorship/partnership commitment form or agreement shall be deemed to be special conditions with respect to these General Terms &amp; Conditions.</p>
                    <p><strong>1.1.2</strong> The agreed sponsorship/partnership fee payable to HumanAIx (hereinafter: the Fee) will be invoiced upon the signature of the contract by both contracting parties. Invoices are due for payment within 30 days from their date of issue, if not stated otherwise. The sponsor/partner is not permitted to participate in the event if full payment of the Fee has not been received by HumanAIx. In case of a default of payment, HumanAIx reserves the right to prohibit the sponsor&apos;s/partner&apos;s access to the event and the related services, to cancel the contract, and/or release the contracted elements and/or designate the exhibit space to other sponsors/partners.</p>
                    <p><strong>1.1.3</strong> Only registered participants of the sponsor/partner will receive their personal conference pass (giving access to the event and the related services, including the conference check-in at the venue). It is a prerequisite for the handing-over of the conference badge at the venue, that the Fee is received by HumanAIx to the designated bank account.</p>

                    <h3 className="text-xl mt-6 mb-3">1.2 LIABILITY AND CANCELLATION</h3>
                    <p><strong>1.2.1</strong> Cancellation by the sponsor/partner must be sent to alessandro@humanaix.io</p>
                    <p><strong>1.2.2</strong> The sponsor/partner shall have the right to terminate the contract free of charge during a period of five days after the signature of the contract by both contracting parties.</p>
                    <p><strong>1.2.3 Contract cancellation fees</strong><br />
                        In the case of contract cancellation by the sponsor/partner later than during the period stipulated in Clause 1.2.2, the following cancellation fees will apply:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-2">
                        <li>50% of the Fee will be refunded to the sponsor/partner in case of cancellation up to 180 days before the event. The remaining 50% of the Fee will be retained by HumanAIx and it is non-refundable. If the Fee has not yet been paid, the sponsor/partner undertakes to pay 50% of the Fee within 10 days of the cancellation of the contract.</li>
                        <li>25% of the Fee will be refunded to the sponsor/partner in case of cancellation up to 120 days before the event. The remaining 75% Fee will be retained by HumanAIx and it is non-refundable. If the Fee has not yet been paid, the sponsor/partner undertakes to pay 75% of the Fee within 10 days of the cancellation of the contract.</li>
                        <li>If the sponsor/partner cancels less than 120 days before the event, the sponsor/partner will be charged 100% of the Fee by HumanAIx and it is non-refundable. If the Fee has not yet been paid, the sponsor/partner undertakes to pay the Fee within 10 days of the cancellation of the contract.</li>
                        <li>In the case that the cancelling sponsor/partner provides a new sponsor/partner as replacement for the cancelled contract, and in the case that a contract with the same or a higher sponsorship/partnership amount has been signed by HumanAIx and the replacing sponsor/partner, a cancellation fee of 20% of the Fee will apply. In addition to that fee, HumanAIx is entitled to charge all services and costs that have been provided or generated on the basis of the cancelled contract. Organizations or persons that have already been offered a sponsorship/partnership by HumanAIx prior to the contract cancellation are not eligible to act as a replacing sponsor/partner.</li>
                        <li>In the case of a travel ban due to Covid-19 regulations that prohibits the cancelling sponsor/partner&apos;s staff members to travel to the location of the event despite a valid Covid-19 vaccination status in their country, the cancelling sponsor/partner can transfer the amount of their booking to a future event (in respect of an HumanAIx event), being held within 2 years from the date of cancellation. In such a case, HumanAIx is entitled to charge all services and costs that have already been incurred on the basis of the cancelled contract.</li>
                    </ul>

                    <p><strong>1.2.4 Cancellation of the event</strong></p>
                    <p><strong>1.2.4.1 Cancellation of the event because of organizational reasons</strong><br />
                        HumanAIx reserves the right to revoke the booking unilaterally and to cancel the event because of organizational reasons. In this case, sponsors/partners can transfer their booking to a future event (in respect of an HumanAIx event), or claim a refund for the cancelled contract. In the latter case, HumanAIx is entitled to charge all services and costs that have already been incurred on the basis of the cancelled contract. In particular, costs incurred by HumanAIx in connection with the event, which have already been paid (regardless of whether the event takes place or not).</p>

                    <p><strong>1.2.4.2 Cancellation of the event because of force majeure</strong><br />
                        HumanAIx reserves the right to cancel the event because of force majeure and/or if he considers that the event poses a high risk for the conference&apos;s attendees. This includes in particular: pandemics and epidemics, armed conflict, civil unrest, terrorist threats, natural disasters, political constraints, significant influence on transport. In this case, sponsors/partners can transfer their booking to a future event (in respect of an HumanAIx event).</p>
                    <p>Further claims are excluded. The same applies to all other services of HumanAIx.</p>

                    <p><strong>1.2.5 Change of the event&apos;s date and/or location</strong><br />
                        HumanAIx reserves the right to change the event&apos;s date and/or location because of organizational reasons. In such a case, all sponsorships/partnerships are transferred to the substitute event.<br />
                        In the case of change of the event&apos;s date and/or location because of organizational reasons, sponsors/partners are entitled, within 14 days from the date of HumanAIx&apos;s announcement of the changed date and/or location, to transfer the amount of their booking to another future event of HumanAIx, being held within 2 years from the date of transfer, or cancel their booking. In the latter case, a cancellation fee of 50% of the contracted amount will apply.<br />
                        HumanAIx reserves the right to change the event&apos;s date and/or location because of force majeure and/or if he considers that the event poses a high risk for the conference&apos;s attendees. This includes in particular: pandemics and epidemics, armed conflict, civil unrest, terrorist threats, natural disasters, political constraints, significant influence on transport. In such a case, all sponsorships/partnerships are transferred to the substitute event. In this case, sponsors/partners are entitled, within 14 days from the date of HumanAIx&apos;s announcement of the changed date and/or location, to transfer the amount of their booking to another future event of HumanAIx, being held within 2 years from the date of transfer.<br />
                        Further claims are excluded. The same applies to all other services of HumanAIx.</p>

                    <p><strong>1.2.6</strong> HumanAIx reserves the right to change the content or schedule of the event, or to replace individual speakers in the form of comparable alternatives. There is no legal claim to HumanAIx in case of changes regarding the content or speaker selection.</p>
                    <p><strong>1.2.7</strong> HumanAIx bears no responsibility for changes needed to the event because of force majeure. HumanAIx reserves the right to replace an in-person event by a digital or hybrid event if he considers that an in-person event poses a high risk for the conference&apos;s attendees. This includes in particular: pandemics and epidemics, armed conflict, civil unrest, terrorist threats, natural disasters, political constraints, significant influence on transport.</p>
                    <p><strong>1.2.8 General Liability Limitations</strong><br />
                        Each partner/sponsor and their staff will solely be liable for any technical malfunctions when they try to connect their devices to any power outlets at the event venue. HumanAIx is not liable for damages due to technical malfunctions that may occur as a result of fluctuating power supply, high voltage or power cuts.</p>

                    <h3 className="text-xl mt-6 mb-3">1.3 MARKETING MATERIAL</h3>
                    <p>If the sponsor/partner wishes to provide marketing material to go into attendees&apos; bags, the sponsor/partner must send the materials in a timely manner to the address provided by HumanAIx. HumanAIx will notify the deadline for sending any materials to the sponsor/partner. If material does not arrive in time or to the provided address, HumanAIx cannot guarantee that your material will be included in the attendee&apos;s bags. HumanAIx is not liable for possible damages caused by untimely or delayed delivery.</p>

                    <h3 className="text-xl mt-6 mb-3">1.4 OFFICIAL WAY OF COMMUNICATION</h3>
                    <p>All major communications regarding the contract between HumanAIx and the sponsor/partner will be conducted via email. HumanAIx will use the email address(es) provided by the sponsor/partner for all official information and announcements related to the signed contract. The sponsor/partner is obliged to ensure that emails sent by HumanAIx to the provided email addresses will be received and read within seven days. Spam filter and other security settings have to be adjusted accordingly by the sponsor/partner. Any claim by sponsors/partners resulting from unread emails will be disregarded.</p>

                    <h2 className="text-2xl mt-8 mb-4">(2) CONFERENCE DELEGATES</h2>
                    <h3 className="text-xl mt-6 mb-3">2.1 BOOKING, PAYMENT, AND DEFAULT OF PAYMENT</h3>
                    <p>The contract/booking between HumanAIx and conference delegates begins with the completion of the ticket order by the customer. In this General Terms &amp; Conditions conference delegate means any entity or individual who has bought ticket(s) to HumanAIx&apos;s event.</p>
                    <p>Delegates are allowed to book conference tickets only for themselves, for colleagues and/or other persons that are directly connected to the business of the delegate. Conference delegates or any attendees are not allowed to sell their conference ticket(s) to third parties.</p>
                    <p>The conference ticket fee is due for payment once the customer receives the invoice. Conference delegates are not permitted to access the event and the related services if full payment has not been received by HumanAIx.</p>
                    <p>All registered conference delegates will receive their personal conference pass (giving access to the event and the related services, including the conference check-in at the venue). It is a prerequisite for the handing-over of the conference badge at the venue that the ticket fee is received by HumanAIx to the designated bank account.</p>

                    <h3 className="text-xl mt-6 mb-3">2.2 WITHDRAWAL, LIABILITY AND CANCELLATION</h3>
                    <p><strong>2.2.1</strong> Any delegate who is a consumer shall be entitled to revoke the offer in accordance with the cancellation and return policy as separately made available to the delegate on our website during the ordering process.</p>
                    <p><strong>2.2.2 Ticket cancellation and refund policy</strong><br />
                        In the case of ticket cancellation, the following refund policy will apply:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-2">
                        <li>Up to 90 days before the event, 90% of the paid amount will be refunded to the delegate</li>
                        <li>Up to 60 days before the event, 70% of the paid amount will be refunded to the delegate</li>
                        <li>Up to 30 days before the event, 50% of the paid amount will be refunded to the delegate</li>
                        <li>After these dates, or in the case of a no-show, HumanAIx will charge 100% of the ticket fee. The allocation of a substitute for the paid ticket is possible at the discretion of HumanAIx.</li>
                    </ul>
                    <p>In case of a major scale force majeure event (such as global pandemics), tickets can be cancelled up to 30 days before the event in exchange for a voucher for an equivalent ticket, valid for a future event of HumanAIx. Ticket vouchers will be valid for 2 years from the date of issue.</p>
                    <p>Further claims are excluded. The same applies to all other services of HumanAIx.</p>

                    <p><strong>2.2.3 Cancellation of the event</strong></p>
                    <p><strong>2.2.3.1 Cancellation of the event because of organizational reasons</strong><br />
                        HumanAIx reserves the right to revoke the booking unilaterally and to cancel the event because of organizational reasons. In such a case, the paid amount for conference tickets will be refunded to the delegate. Further claims are excluded. The same applies to all other services of HumanAIx.</p>
                    <p><strong>2.2.3.2 Cancellation of the event because of force majeure</strong><br />
                        HumanAIx reserves the right to cancel the event because of force majeure and/or if he considers that the event poses a high risk for the conference&apos;s attendees. This includes in particular: pandemics and epidemics, armed conflict, civil unrest, terrorist threats, natural disasters, political constraints, significant influence on transport. In this case, all purchased tickets will be cancelled in exchange for a voucher for an equivalent ticket for a future event of HumanAIx. Ticket vouchers will be valid for 2 years from the date of issue. Further claims are excluded. The same applies to all other services of HumanAIx.</p>

                    <p><strong>2.2.4 Change of date and/or location of the event</strong></p>
                    <p><strong>2.2.4.1 Change of date and/or location of the event because of organizational reasons</strong><br />
                        HumanAIx reserves the right to change the date and/or location of the event because of organizational reasons. In such a case, all purchased tickets are transferred to and valid for the substitute event.<br />
                        In the case of change of the event&apos;s date and/or location because of organizational reasons, delegates are entitled to cancel their tickets within 14 days from the date of HumanAIx&apos;s announcement of the changed date and/or location and to receive a ticket refund of 100% of the paid amount.</p>
                    <p><strong>2.2.4.2 Change of date and/or location of the event because of force majeure</strong><br />
                        HumanAIx reserves the right to change the date and/or location of the event because of force majeure and/or if he considers that the event poses a high risk for the conference&apos;s attendees. This includes in particular: pandemics and epidemics, armed conflict, civil unrest, terrorist threats, natural disasters, political constraints, significant influence on transport. In such a case, all purchased tickets are transferred to and valid for the substitute event, and delegates are entitled to cancel their tickets within 14 days from the date of HumanAIx&apos;s announcement of the changed date and/or location in exchange for a voucher for an equivalent ticket, valid for a future event of HumanAIx. Ticket vouchers will be valid for 2 years from the date of issue. Further claims are excluded. The same applies to all other services of HumanAIx.</p>

                    <p><strong>2.2.5</strong> HumanAIx reserves the right to change the content or schedule of the event, or to replace individual speakers in the form of comparable alternatives. There is no legal claim to HumanAIx in case of changes regarding the content or speaker selection.</p>
                    <p><strong>2.2.6</strong> HumanAIx bears no responsibility for changes needed to the event because of force majeure. HumanAIx reserves the right to replace an in-person event by a digital or hybrid event if he considers that an in-person event poses a high risk for the conference&apos;s attendees. This includes in particular: pandemics and epidemics, armed conflict, civil unrest, terrorist threats, natural disasters, political constraints, and significant influence on transport.</p>
                    <p><strong>2.2.7 General Liability Limitations</strong><br />
                        Each attendee will be solely liable for any technical malfunctions when they try to connect their devices to any power outlets at the event venue. HumanAIx is not liable for damages due to technical malfunctions that may occur as a result of fluctuating power supply, high voltage or power cuts. HumanAIx is not liable for the session content presented by the selected speakers.</p>

                    <h3 className="text-xl mt-6 mb-3">2.3 OFFICIAL WAY OF COMMUNICATION</h3>
                    <p>All major communications regarding purchased conference tickets will be conducted via email. HumanAIx will use the email address(es) provided during the ticket ordering process and/or the ticket allocation(s). Delegates and conference attendees who are allocated a conference ticket are obliged to ensure that emails sent by HumanAIx to the provided email address(es) will be read within seven days. Spam filter and other security settings have to be adjusted accordingly by the ticket purchaser. Any claim resulting from unread emails will be disregarded.</p>

                    <h2 className="text-2xl mt-8 mb-4">(3) PRIVACY, COPYRIGHT AND TRANSFER BAN</h2>
                    <p>All personal data is processed in accordance with the applicable laws and our policies. HumanAIx ensures that your personal data is treated confidentially. HumanAIx ensures by law, that it does not pass personal data to unauthorized third parties, unless we are legally obligated to do so, or explicit prior consent has been given. For further information about data protection, please refer to the Privacy Policy.</p>
                    <p>HumanAIx reserves all copyright and other intellectual property rights relating to the event name, event magazine, event program, and all other event documentation.</p>

                    <h2 className="text-2xl mt-8 mb-4">(4) CODE OF CONDUCT</h2>
                    <p>The goal of HumanAIx&apos;s event is to bring the community together, to empower technology and business staff to achieve more in the collaboration arena. HumanAIx seeks to create a respectful, friendly, and inclusive experience for all participants.</p>
                    <p>As such, HumanAIx does not tolerate harassing or disrespectful behavior, messages, images, or interactions by any event participant, in any form, at any aspect of the program including business and social activities, regardless of location.</p>
                    <p>HumanAIx does not tolerate any behavior that is degrading to any gender, race, sexual orientation or disability, or any behavior that would violate Anti-Harassment and Non-Discrimination legislation and rules of the European Union or laws at the location of the event venue, or standards of business conduct. In short, the entire experience at the venue must reflect core standards which promote tolerance, respectful behavior and collaboration!</p>
                </div>
            </div>
            <Footer data={siteConfig.footer} navData={siteConfig.navigation} onShowToast={() => { }} onOpenContact={() => { }} />
        </main>
    )
}
