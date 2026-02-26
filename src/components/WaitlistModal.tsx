'use client';
import React, { useState } from 'react';

interface WaitlistModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({ isOpen, onClose }) => {
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate submission (replace with real endpoint as needed)
        await new Promise(res => setTimeout(res, 800));
        setLoading(false);
        setSubmitted(true);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 z-10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
                >
                    <i className="ri-close-line text-lg"></i>
                </button>

                {submitted ? (
                    <div className="text-center py-8 space-y-4">
                        <div className="w-14 h-14 rounded-full bg-brand-blue/10 flex items-center justify-center mx-auto">
                            <i className="ri-check-line text-2xl text-brand-blue"></i>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">You&apos;re on the list!</h2>
                        <p className="text-slate-500 text-sm">We&apos;ll be in touch with updates about DeAI Summit 2026.</p>
                        <button
                            onClick={onClose}
                            className="mt-4 px-6 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 mb-1">Join the Waitlist</h2>
                            <p className="text-slate-500 text-sm">Be first to know when tickets open for DeAI Summit 2026.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        required
                                        value={form.firstName}
                                        onChange={handleChange}
                                        placeholder="Jane"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        required
                                        value={form.lastName}
                                        onChange={handleChange}
                                        placeholder="Smith"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="jane@example.com"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-brand-blue transition-colors shadow-md hover:shadow-xl disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <><i className="ri-loader-4-line animate-spin"></i> Submitting...</>
                                ) : (
                                    <><i className="ri-mail-send-line"></i> Join Waitlist</>
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};
