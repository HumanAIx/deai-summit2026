import React from 'react';
import Navbar from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { siteConfig } from '@/config/site';

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-white">
            <Navbar data={siteConfig.navigation.main} onOpenContact={() => { }} onShowToast={() => { }} />
            <div className="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto text-slate-900">
                <h1 className="text-4xl md:text-5xl font-bold mb-8">Data Protection / Data Privacy Scope</h1>

                <div className="prose prose-slate max-w-none prose-headings:font-semibold prose-a:text-brand-blue">
                    <p>This privacy policy clarifies the use, scope and purpose of the collection and use of personal data by the controller HumanAIx Association, a non-profit association organized under Swiss law, with its registered office at Bundesstrasse 3, 6302 Zug, Switzerland, hereinafter referred to as "HumanAIx" (hereinafter referred to as &quot;we&quot;) on this website (hereinafter referred to as &quot;website&quot;).</p>
                    <p>We take your privacy very seriously and will treat your personal information confidentially and in accordance with the law. Due to technological advancements, updates of legal acts and the continued evolution of this website, changes may be made to this Privacy Policy. We encourage you to review the Privacy Policy periodically. We will not process your personal data for any new purposes without notifying you in advance.</p>

                    <h2 className="text-2xl mt-8 mb-4">Handling of Personal Data</h2>
                    <p>We collect, use and transfer your personal data only if there is a legal basis to do so. Such legal basis may be an agreement between us, our legitimate interest, a legal obligation, or your consent.</p>
                    <p>We disclose personal information only to the extent and in the form necessary for the fulfilment of the purposes listed in the Privacy Policy. We may transfer your personal data to other data controllers or processors. For example, we may share information with companies that provide support services to us (e-mail, marketing). These companies may need information about you in order to perform their functions. Data processors are not authorized to use the shared data for any other purpose. We may also be required to transfer personal data if we are legally bound by such an obligation. For example, we might be obligated to disclose personal data to public authorities upon their legitimate request.</p>
                    <p>Personal information means all information that is used to identify your person, and which can be traced back to you &ndash; such as your name, email address and telephone number, but also data about a person&apos;s preferences, memberships or which websites were viewed. Please find information about data which we collect below.</p>
                    <p>To improve our website, we may store information about your access to this website. These access data include, for example, the file you requested or the name of your Internet service provider. Due to the anonymization of the data, conclusions about your person are usually not possible. However, in some cases, you may be identifiable based on, for example, your IP address. Therefore, we also provide information about such data in this Privacy Policy.</p>
                    <p>We generally process your data in the European Union. However, some data may be also transferred to third countries (such as data related to the use of cookies). If any data is transferred to third countries, the transfer is based on an adequacy decision by the EU Commission or is subject to other appropriate safeguards. We will carefully assess all the circumstances and make sure appropriate safeguards are put in place so that your rights are not in any way undermined. We make sure that conditions to enforce your rights and effective legal remedies are available.</p>

                    <h2 className="text-2xl mt-8 mb-4">Categories of Personal Data</h2>
                    <p>When you visit our website, we may process some data about your access and server log files. Our website also uses cookies. Please find more information about these below.</p>
                    <p>When you register to an event via the website, we process the data which you provide to us in the registration form. Please find more information about these below.</p>
                    <p>When you contact us or post any content (comments, contributions), we process the contents of your input and any data associated with your request.</p>

                    <h2 className="text-2xl mt-8 mb-4">Access Data / Server Log Files</h2>
                    <p>We collect data about website access based on our legitimate interest, including improving the user-friendliness and security of the website. The following data is logged:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-2">
                        <li>User&apos;s last visit on website</li>
                        <li>Time of access</li>
                        <li>Used IP address</li>
                        <li>Error-Logs (error messages, accessing IP address and, depending on the error, the website accessed)</li>
                    </ul>
                    <p>All log files are stored for a while but will be periodically deleted. Generally, the log files will be kept for 6 months. The data is stored for security reasons, for example to clarify cases of abuse. If data must be retained longer for reasons of proof, they are excluded from the deletion until the incident has been finally clarified.</p>
                    <p>We use most of the log data only for statistical evaluations for the purpose of operation, security, and optimization of the website. However, the log data is also processed if there is a reasonable suspicion of unlawful use.</p>

                    <h2 className="text-2xl mt-8 mb-4">Registration to Events</h2>
                    <p>When you register to an event on our website, we ask for your basic personal data such as name and surname, country, email address, etc. This information will be used to identify you on site and will also be printed on your conference badge (commonly your name and name of the company you represent). As participation is possible only with a valid ticket, we will also ask for your billing data for the purpose of invoicing. Submitting the information requested in the registration form is a mandatory prerequisite for registering for the event. It is not possible to register for or participate in the event without providing the requested information.</p>
                    <p>Once the user has been registered, the user can add additional optional information to the user&apos;s profile. For example, the user can add profile photo, biography, work information, field of industry, topics of interest, spoken languages, links to websites and social media profiles and other.</p>
                    <p>For the purpose of organizing the event, we may also ask for additional information such as your dietary requirement. We may also provide you with an option to introduce yourself and add information about your biography, fields of interest, how you got to know about the event, whether you have attended before, personal website and social media profiles, blog links etc &ndash; all of that on a voluntary basis (unless stated otherwise in the data collection form) and for networking purposes between event attendees. Such data fields are optional data fields. You can register and participate in the event without providing such information.</p>
                    <p>If you are a speaker at our event, we will ask for your profile pictures.</p>
                    <p>The data is processed for event-specific purposes only. The data will mostly be used for billing, statistics, distribution and marketing purposes. Our service provider Nubelus UG (An der R&ouml;mervilla 8, 55411 Bingen am Rhein, Germany) will provide us technical solutions for the ticket sale and other attendee/sponsor management features. Nubelus UG may process your data as a processor, solely for the purposes determined by us.</p>

                    <h2 className="text-2xl mt-8 mb-4">Participation in Events</h2>
                    <p>When you participate in our events as partner, sponsor or just attendee, we may process additional information about you. Personal data shall be stored in accordance with the need for their use and the time limits provided by law.</p>
                    <p>During the event, our systems will collect information about the session evaluations (for example, attendees can scan a QR code when entering a session room and then evaluate that session; session attendance, participation in gamification (via mobile apps, surveys, etc) &ndash; but none of that will be collected without the specific consent by the data subject on-site.</p>
                    <p>During the event, our sponsors and partners may collect your information if you give them your consent. For example, the sponsors and partners can ask for your information. Also, you can present your conference badge to them for scanning. This will allow them to collect your information. Please note that the QR scan will provide to the sponsors and partners all the data that you have provided when registering to the event and/or on your user profile. Please note that in such cases the sponsor/partner will be the controller of your data and you should request from them information regarding processing of your personal data.</p>
                    <p>Photo, video and audio recordings will be made at the event. The photo, video and audio materials are in the sole ownership of the Organizer. We process them on the basis of a legitimate interest (event management, customer management, security). The recording may be used also for promotional purposes.</p>

                    <h2 className="text-2xl mt-8 mb-4">Requests, Comments and Contributions</h2>
                    <p>If you contact us, your contact details and contents of the request will be stored so that they can be used to process and answer your request. This data will be processed based on your consent or our legitimate interest (customer communication, customer management, protection of our rights). Without your consent, this data will not be disclosed to third parties.</p>
                    <p>As the data is collected based on your consent, we will process the data as long as your consent is valid. We will also periodically review the data and delete any data that is obsolete and no longer necessary.</p>

                    <h2 className="text-2xl mt-8 mb-4">Newsletters</h2>
                    <p>We inform you about our offers as well as updates about us through our newsletter. If you would like to receive the newsletter, we require a valid email address. We furthermore require information, which allows us to verify that you are the owner of the email address provided or, should you not be the owner, that the owner of the email address agrees to receive the newsletter. Further data is not collected.</p>
                    <p>By registering for the newsletter, we will store your IP address and the date of the registration. This storage serves solely as proof of your consent and also as proof in the event that a third party misuses an email address and registers for a newsletter without the consent of the person entitled to receive the newsletter.</p>
                    <p>You can revoke your consent to the processing of your data for the purpose of sending the newsletters at any time. The revocation can be confirmed through the link included in our newsletters, by updating your preferences in your profile area or by notifying us directly (see contact details above).</p>
                    <p>After your cancellation the deletion of your personal data takes place. Your consent to the newsletter shipping expires at the same time.</p>
                    <p>Please note that if you withdraw your consent to receive newsletters, we may still use your contact information to send you information about any of our events you have registered for.</p>
                    <p>This data is only used for distributing the newsletter and will not be passed on to third parties. Please note that our service providers as processors are not considered third parties. The newsletter is sent through the service provider Mailjet by Sinch, 112 E. Pecan Street &ndash; San Antonio, TX 78205, USA. Information about the data protection regulations of the service provider is available at <a href="https://mailjet.com/dpa" target="_blank" rel="noopener noreferrer">https://mailjet.com/dpa</a>.</p>

                    <h2 className="text-2xl mt-8 mb-4">Integration of Third-Party Services and Content</h2>
                    <p>Third party contents, such as videos from YouTube, maps from Azure Maps, RSS feeds or graphics from other websites may be embedded, which presumes that providers of these contents (hereinafter referred to as &quot;third-party providers&quot;) perceive the IP address of the users. Without the IP address, they would not be able to send the content to the user&apos;s browser. The IP address is therefore required for the transmission and display of these contents. We will make every effort to only use content of providers, who in turn only use the IP address for the delivery of the content.</p>

                    <h2 className="text-2xl mt-8 mb-4">Cookies</h2>
                    <p>This website uses cookies for the pseudonymized range measurement, which are transmitted either from our server or the third-party server to the user&apos;s browser. Cookies are small files that are stored on your device. Your browser accesses these files. The use of cookies increases the user-friendliness and security of this website.</p>
                    <p>You have the right to choose whether to accept the use of cookies unless the cookie is necessary for the core functionalities of the website. We use cookies that are not necessary for the operation of the website only with your prior consent.</p>
                    <p>If you do not want to save cookies on your device, there are also browser-based options to restrict the use of cookies. You can read more about these here:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-2">
                        <li>Cookie opt-out page of the Network Advertising Initiative: <a href="http://optout.networkadvertising.org/?c=1" target="_blank" rel="noopener noreferrer">http://optout.networkadvertising.org/</a></li>
                        <li>Cookie deactivation page on the US website: <a href="http://optout.aboutads.info/?c=2" target="_blank" rel="noopener noreferrer">http://optout.aboutads.info/</a></li>
                        <li>Cookie deactivation page of the European website: <a href="http://optout.networkadvertising.org/?c=1" target="_blank" rel="noopener noreferrer">http://optout.networkadvertising.org/</a></li>
                    </ul>
                    <p>Popular browsers offer the preference option of not allowing cookies. However, please note that if you limit the use of functionally required cookies, this could affect the availability and functionality of our website. There is no guarantee that you will be able to access all the functions of this website without restrictions if you apply extensive browser-based limiting settings.</p>

                    <h2 className="text-2xl mt-8 mb-4">Rights of the Data Subject</h2>
                    <p>As a data subject, you have the right to receive information about your personal data which has been processed by us. You also have the right to correct incorrect data and to restrict the processing or delete your personal data. Please note that these rights are not absolute and may be subject to limitations. If you believe your data has been processed unlawfully, you can file a complaint with the supervisory authority.</p>
                    <p>If you would like a correction, blocking, deletion or information about the personal data stored about you, or if you have questions regarding the collection, processing or use of your personal data or if you would like to revoke your consent, please contact the following e-mail address: info@deaisummit.org</p>
                    <p>We will fulfil your request within a reasonable time, but no later than one month after receiving the request.</p>

                    <h2 className="text-2xl mt-8 mb-4">Deletion of Data</h2>
                    <p>If your request does not conflict with a need or legal duty to store data, you have the right to request deletion of your data. Data stored by us, if they are no longer necessary for their purpose and there are no legal retention periods, will be deleted. If deletion cannot be carried out because the data is required for legitimate legal purposes, data is not deleted but in some cases the processing may be restricted (i.e., limited to certain processing activities). In this case, the data is not processed for any other purposes.</p>

                    <h2 className="text-2xl mt-8 mb-4">Right to Object</h2>
                    <p>Users of this website may exercise their right of objection and object to the processing of their personal data if the processing is based on legitimate interest. The objection must be based on grounds relating to your particular situation.</p>

                    <h2 className="text-2xl mt-8 mb-4">Withdrawal of Consent</h2>
                    <p>Where the processing is based on your consent, you have the right to withdraw such consent at any time. Please note that the withdrawal does not affect the lawfulness of processing based on consent before its withdrawal.</p>

                    <p className="mt-8 italic text-slate-500">This Privacy Policy was last updated on 23 February 2026.</p>
                </div>
            </div>
            <Footer data={siteConfig.footer} navData={siteConfig.navigation} onShowToast={() => { }} onOpenContact={() => { }} />
        </main>
    )
}
