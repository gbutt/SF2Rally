public with sharing class ctr_Case2Rally {

	private final Case sfCase;

    // The extension constructor initializes the private member
    // variable mysObject by using the getRecord method from the standard
    // controller.
    public ctr_Case2Rally(ApexPages.StandardController stdController) {
        this.sfCase = (Case)stdController.getRecord();
    }

}