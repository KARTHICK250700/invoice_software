

@app.get('/api/quotations/{quotation_id}/test')
async def get_quotation_for_pdf_test(quotation_id: int):
    return {'message': 'Test endpoint for quotation PDF'}

