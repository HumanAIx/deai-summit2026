'use client';

import React, { useState } from 'react';
import { UnderConstruction } from '@/components/UnderConstruction';
import { ContactModal } from '@/components/ContactModal';
import { Toast } from '@/components/Toast';
import { siteConfig } from '@/config/site';

export default function ComingSoonPage() {
    const [toast, setToast] = useState({ visible: false, message: '' });
    const [isContactOpen, setIsContactOpen] = useState(false);

    // We can keep the toast capability if needed by the modal or other interactions
    // even if not explicitly triggered by the UnderConstruction component yet.
    const showToast = (message: string) => {
        setToast({ visible: true, message });
    };

    const closeToast = () => {
        setToast(prev => ({ ...prev, visible: false }));
    };

    const handleOpenContact = () => {
        setIsContactOpen(true);
    };

    return (
        <>
            <UnderConstruction
                onOpenContact={handleOpenContact}
                data={siteConfig}
            />

            <ContactModal
                isOpen={isContactOpen}
                onClose={() => setIsContactOpen(false)}
            />

            <Toast
                message={toast.message}
                isVisible={toast.visible}
                onClose={closeToast}
            />
        </>
    );
}
