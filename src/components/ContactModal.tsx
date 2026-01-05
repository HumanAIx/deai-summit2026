import React, { useState, useEffect } from 'react';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
    const [isClosing, setIsClosing] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 300);
    };

    if (!isVisible && !isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen && !isClosing ? 'opacity-100' : 'opacity-0'}`}>

            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div className={`relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 ${isOpen && !isClosing ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>

                {/* Header */}
                <div className="relative px-8 pt-8 pb-6 bg-[#F9FAFB] border-b border-slate-100">
                    <button
                        onClick={handleClose}
                        className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100"
                    >
                        <i className="ri-close-line text-2xl"></i>
                    </button>

                    <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Get in touch</h2>
                    <p className="text-sm text-slate-500">
                        Fill out the form below and our team will get back to you shortly.
                    </p>
                </div>

                {/* Form */}
                <div className="p-8">
                    <form className="space-y-5" onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const data = {
                            firstName: formData.get('firstName'),
                            lastName: formData.get('lastName'),
                            email: formData.get('email'),
                            inquiryType: formData.get('inquiryType'),
                            message: formData.get('message'),
                        };
                        console.log('----------------------------------------');
                        console.log('📩 New Contact Form Submission:');
                        console.log(data);
                        console.log('----------------------------------------');
                        alert('Form submitted! Check the developer console for the captured data.');
                        handleClose();
                    }}>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">First Name</label>
                                <input
                                    name="firstName"
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                    placeholder="Jane"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Last Name</label>
                                <input
                                    name="lastName"
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Address</label>
                            <input
                                name="email"
                                type="email"
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                placeholder="jane@company.com"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inquiry Type</label>
                            <div className="relative">
                                <select
                                    name="inquiryType"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue appearance-none transition-all"
                                >
                                    <option value="General Inquiry">General Inquiry</option>
                                    <option value="Sponsorship Opportunities">Sponsorship Opportunities</option>
                                    <option value="Media & Press">Media & Press</option>
                                    <option value="Speaker Application">Speaker Application</option>
                                </select>
                                <i className="ri-arrow-down-s-line absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Message</label>
                            <textarea
                                name="message"
                                rows={4}
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all resize-none"
                                placeholder="How can we help you?"
                            ></textarea>
                        </div>

                        <button className="w-full py-4 bg-brand-dark text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-slate-800 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 group">
                            <span>Send Message</span>
                            <i className="ri-send-plane-fill group-hover:translate-x-1 transition-transform"></i>
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
};
